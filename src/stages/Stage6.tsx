import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/Button';
import { drawWordCloud } from '../utils/canvas';
import { useAI } from '../contexts/AIContext';

interface Props {
  onComplete: (score: number, extraData?: any) => void;
  playerName: string;
  isTeacherTestSession?: boolean;
  hasCompletedBefore?: boolean;
  onGoToStage8Password?: () => void;
}

type FlowAction = 'segment' | 'keywords' | 'count' | 'merge' | 'cloud';

const FLOW_ACTIONS: { id: FlowAction; label: string; icon: string; analysis: string }[] = [
  { id: 'segment', label: '分词', icon: '✂️', analysis: '分词是第一步，只有把长文本切成词语，后面才知道要处理哪些词。' },
  { id: 'keywords', label: '保留关键词', icon: '🧹', analysis: '分词后要先保留关键词、去掉停用词，否则“的、了、在”等词会干扰统计。' },
  { id: 'count', label: '算词频', icon: '🧮', analysis: '关键词确定后，下一步才是数每个词出现了几次。' },
  { id: 'merge', label: '合并同义词', icon: '🔗', analysis: '算出词频后，还要把指向同一事物的词合并，避免同一个意思被拆散。' },
  { id: 'cloud', label: '生成词云图', icon: '✨', analysis: '只有完成分词、保留关键词、词频统计和同义词合并后，才能生成准确的词云图。' },
];

const NEXT_STEP_COPY: Record<FlowAction, string> = {
  segment: '先把文本拆成一个个词语。',
  keywords: '去掉无意义词，保留真正有用的关键词。',
  count: '统计每个关键词出现的次数。',
  merge: '把指向同一人物或事物的同义词合并。',
  cloud: '用最终词频绘制词云图。',
};

const NEXT_ACTION_BY_STEP: Record<number, FlowAction> = {
  0: 'segment',
  1: 'keywords',
  2: 'count',
  3: 'merge',
  4: 'cloud',
};

const NEXT_CHOICE_TITLE_BY_STEP: Record<number, string> = {
  0: '准备开始实战，第一步该做什么？',
  1: '已经看过分词效果了，下一步该做什么？',
  2: '已经看过关键词效果了，下一步该做什么？',
  3: '已经看过词频统计结果了，下一步该做什么？',
  4: '已经看过同义词合并结果了，最后一步该做什么？',
};

const REVIEW_SECONDS = 15;
const MANUAL_ASSIST_SECONDS = 30;

const pickPracticeSentence = (text: string) => {
  const body = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(1)
    .join('') || text;

  const sentences = body
    .split(/[。！？!?；;]/)
    .map(sentence => sentence.replace(/[，、,.]/g, '').trim())
    .filter(sentence => sentence.length >= 8);

  const picked = sentences.find(sentence => sentence.length <= 24) || sentences[0] || body.trim();
  return picked.slice(0, 24);
};

export const Stage6: React.FC<Props> = ({
  onComplete,
  playerName,
  isTeacherTestSession = false,
  hasCompletedBefore = false,
  onGoToStage8Password,
}) => {
  const { triggerAI } = useAI();
  const [showIntroModal, setShowIntroModal] = useState(true);
  const [rawText, setRawText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('学生自选文本');
  const [step, setStep] = useState(0); // 0:input, 1:segmented, 2:keywords, 3:counted, 4:merged, 5:cloud
  
  const [words, setWords] = useState<string[]>([]);
  const [cleaned, setCleaned] = useState<string[]>([]);
  const [wordFreq, setWordFreq] = useState<{text: string, count: number}[]>([]);
  
  const [isLoadingStep, setIsLoadingStep] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [flowChoice, setFlowChoice] = useState<{ title: string; correct: FlowAction; analysis: string } | null>(null);
  const [flowMistakes, setFlowMistakes] = useState(0);
  const [reviewRemaining, setReviewRemaining] = useState(0);
  const [assistRemaining, setAssistRemaining] = useState(0);
  const [manualFeedbackIds, setManualFeedbackIds] = useState<string[]>([]);
  const [manualRemovedKeywordIds, setManualRemovedKeywordIds] = useState<number[]>([]);
  const [manualCountPreview, setManualCountPreview] = useState<Record<string, number>>({});
  const [manualMergeIds, setManualMergeIds] = useState<number[]>([]);

  const setWithLoading = (stepNum: number, msg: string) => {
    setIsLoadingStep(stepNum);
    setLoadingMessage(msg);
  };
  
  const [manualSplitText, setManualSplitText] = useState('');
  const [practiceWords, setPracticeWords] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const articleRows = useMemo(() => {
    const lineEstimate = rawText
      .split('\n')
      .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 28)), 0);
    return Math.max(10, lineEstimate);
  }, [rawText]);

  const articleTextHeight = `${articleRows * 30 + 56}px`;
  const canStartReviewTimer =
    !!rawText.trim() &&
    !activeTask &&
    !isLoadingStep &&
    !isGeneratingText &&
    !flowChoice &&
    step >= 0 &&
    step < 5;
  const isReviewLocked = canStartReviewTimer && reviewRemaining > 0;

  useEffect(() => {
    if (!canStartReviewTimer) {
      setReviewRemaining(0);
      return;
    }

    setReviewRemaining(REVIEW_SECONDS);
    const timer = window.setInterval(() => {
      setReviewRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [canStartReviewTimer, step, rawText]);

  useEffect(() => {
    if (!activeTask || isLoadingStep) {
      setAssistRemaining(0);
      return;
    }

    setAssistRemaining(MANUAL_ASSIST_SECONDS);
    const timer = window.setInterval(() => {
      setAssistRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTask, isLoadingStep]);

  const parseArticleContent = () => {
    const normalized = rawText.trim();
    if (!normalized) {
      return {
        articleTitle: '',
        articleBody: '',
      };
    }

    const lines = normalized
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return {
        articleTitle: normalized.slice(0, 18),
        articleBody: normalized,
      };
    }

    return {
      articleTitle: lines[0],
      articleBody: lines.slice(1).join('\n') || lines[0],
    };
  };

  const playSuccess = () => new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => {});
  const playError = () => new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3').play().catch(() => {});

  const callDeepSeek = async (prompt: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, temperature: 0.7 }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('API Exception');
      const data = await res.json();
      return data.content;
    } catch (e) {
      clearTimeout(timeoutId);
      throw new Error('Connection or Timeout Error');
    }
  };

  const processTextWithAI = async (prompt: string) => {
    const reply = await callDeepSeek(prompt);
    return reply;
  };

  const pulseManualFeedback = (id: string) => {
    setManualFeedbackIds(prev => prev.includes(id) ? prev : [...prev, id]);
    window.setTimeout(() => {
      setManualFeedbackIds(prev => prev.filter(item => item !== id));
    }, 650);
  };

  const toggleManualKeyword = (index: number) => {
    pulseManualFeedback(`keyword-${index}`);
    setManualRemovedKeywordIds(prev =>
      prev.includes(index) ? prev.filter(item => item !== index) : [...prev, index]
    );
  };

  const addManualCount = (word: string, index: number) => {
    pulseManualFeedback(`count-${index}`);
    setManualCountPreview(prev => ({
      ...prev,
      [word]: (prev[word] || 0) + 1,
    }));
  };

  const toggleManualMerge = (index: number) => {
    pulseManualFeedback(`merge-${index}`);
    setManualMergeIds(prev =>
      prev.includes(index) ? prev.filter(item => item !== index) : [...prev, index]
    );
  };

  const assistButtonProps = (tone: 'gold' | 'cyan') => {
    const shouldShake = assistRemaining === 0;
    const activeClass = tone === 'gold'
      ? 'bg-brand-gold/90 hover:bg-brand-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.5)]'
      : 'bg-brand-cyan/90 hover:bg-brand-cyan text-black shadow-[0_0_15px_rgba(26,188,156,0.4)]';

    return {
      animate: shouldShake ? { x: [0, -5, 5, -4, 4, 0], scale: [1, 1.03, 1] } : {},
      transition: shouldShake ? { duration: 0.75, repeat: Infinity, repeatDelay: 1.4 } : {},
      className: `mt-2 w-full py-3 font-bold rounded-xl transition-all transform ${activeClass} hover:scale-[1.02]`,
    };
  };

  const assistHint = assistRemaining > 0
    ? `可以先自己试一试；${assistRemaining}s 后按钮会抖动提醒。`
    : '可以点击大圣辅助继续处理整篇文章。';

  const openNextChoice = (title: string, correct: FlowAction) => {
    setFlowChoice({
      title,
      correct,
      analysis: '',
    });
  };

  const openCurrentNextChoice = () => {
    if (activeTask || isLoadingStep) return;
    if (!rawText.trim()) {
      triggerAI('请先在左侧输入一段文章，或者选择一个素材，再开始实战。');
      return;
    }
    if (reviewRemaining > 0) {
      triggerAI(`请先认真观察当前内容，还需要等待 ${reviewRemaining} 秒再继续。`);
      return;
    }

    const correct = NEXT_ACTION_BY_STEP[step];
    if (!correct) return;
    openNextChoice(NEXT_CHOICE_TITLE_BY_STEP[step], correct);
  };

  const enterFlowAction = (action: FlowAction) => {
    if (action === 'segment') handleStep1();
    if (action === 'keywords') handleStep2();
    if (action === 'count') handleStep3();
    if (action === 'merge') handleStep4();
    if (action === 'cloud') handleStep5();
  };

  const chooseFlowAction = (action: FlowAction) => {
    if (!flowChoice) return;
    if (action === flowChoice.correct) {
      setFlowChoice(null);
      playSuccess();
      enterFlowAction(action);
      return;
    }

    const selected = FLOW_ACTIONS.find(item => item.id === action);
    const correct = FLOW_ACTIONS.find(item => item.id === flowChoice.correct);
    const analysis = `现在不能做“${selected?.label || ''}”。${selected?.analysis || ''} 正确下一步是“${correct?.label || ''}”：${NEXT_STEP_COPY[flowChoice.correct]}`;
    setFlowMistakes(count => count + 1);
    setFlowChoice(prev => prev ? { ...prev, analysis } : prev);
    playError();
    triggerAI(analysis);
  };

  const parseMergedWordFreq = (reply: string) => {
    const fallback = wordFreq;
    try {
      const jsonText = reply.match(/\[[\s\S]*\]/)?.[0] || reply;
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) return fallback;
      const normalized = parsed
        .map(item => ({
          text: String(item.text || item.word || '').trim(),
          count: Number(item.count ?? item.value ?? 0),
        }))
        .filter(item => item.text && Number.isFinite(item.count) && item.count > 0)
        .sort((a, b) => b.count - a.count);
      return normalized.length > 0 ? normalized : fallback;
    } catch {
      return fallback;
    }
  };

  const generateSampleText = async (type: string, isClassic: boolean = false) => {
    if (step > 0) return;
    setIsGeneratingText(true);
    setSourceLabel(isClassic ? `名著改写 · ${type}` : `AI 生成素材 · ${type}`);
    setRawText('大圣正在施展分身法替你搬运文章中，大约需要几秒钟...');
    try {
      let prompt = '';
      if (isClassic) {
        prompt = `请把中国古典名著《${type}》中的一个经典情节，改写成适合四年级学生阅读的白话短文。\n要求：\n1. 不要直接摘录原文，不要使用难懂的文言句子。\n2. 字数在300字到400字之间。\n3. 第一行必须是提炼出的题目。\n4. 第二行开始直接输出正文。\n5. 语言浅显、情节清楚，适合四年级学生阅读。\n6. 不要多余解释。`;
      } else {
        prompt = `请用中文写一篇关于“${type}”的${type === '新闻' ? '报道' : '文章'}。\n要求：\n1. 字数在300字到400字之间。\n2. 第一行提炼出题目。\n3. 第二行开始直接正文。\n4. 适合小学生阅读。\n5. 直接输出题目和正文，不要任何说明性前缀或后缀。`;
      }
      const reply = await processTextWithAI(prompt);
      setRawText(reply);
    } catch (e) {
      setRawText('网络有点卡，写文失败了，大圣建议你自己复制一点文本过来哦！');
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleStep1 = () => {
    if (!rawText.trim()) return triggerAI('学生连文本都没输入就想分词，请提示他先在下面文本框输入或拷贝一段文章。');
    if (step >= 1) return;
    setManualSplitText('');
    setActiveTask(1);
    setFailCount(0);
  };

  const autoStep1 = async () => {
    setWithLoading(1, '正在念分词咒，请稍候...');
    setActiveTask(null);
    try {
      const res = await processTextWithAI(`请对以下文本进行中文分词，仅返回用空格分隔的词语，不要任何解释和其他文字，过滤掉常见标点符号：\n${rawText.slice(0, 400)}`);
      setWords(res.split(/[\s,，。、]+/).filter(w => w.trim().length > 0));
      setStep(1);
      playSuccess();
      triggerAI('太棒了，分词完成！先看看分词后的效果，确认明白后再点击“下一步”。');
    } catch (e) {
      triggerAI('API调用太拥挤啦，一直施法中失败了，请引导学生重新点击自动分词尝试！');
    } finally {
      setIsLoadingStep(null);
    }
  };

  const handleStep2 = () => {
    if (step < 1) return triggerAI('学生跳过了分词，直接想保留关键词。请大声提示他必须先完成第一步分词！');
    if (step >= 2) return;
    setPracticeWords(words.slice(0, 18));
    setManualRemovedKeywordIds([]);
    setActiveTask(2);
    setFailCount(0);
  };

  const autoStep2 = async () => {
    setWithLoading(2, '正在施展净水术，保留关键词...');
    setActiveTask(null);
    try {
      const res = await processTextWithAI(`下面是已经分好词的文本，请彻底过滤掉无用的停用词（如的、了、在、是、和、就），保留有意义的关键词。暂时不要合并同义词，仅返回处理后用空格分隔的词语，不要任何解释：\n${words.slice(0, 300).join(' ')}`);
      setCleaned(res.split(/[\s,，。、]+/).filter(w => w.trim().length > 0));
      setStep(2);
      playSuccess();
      triggerAI('关键词保留完成！先观察保留下来的关键词，再点击“下一步”判断后面的操作。');
    } catch {
      triggerAI('网络清洗发生波动，请让学生再试一次。');
    } finally {
      setIsLoadingStep(null);
    }
  };

  const handleStep3 = () => {
    if (step < 2) {
      if (step === 0) triggerAI('还没分词和清洗呢，怎么能直接统计！请提示他按顺序先分词。');
      else triggerAI('还没有保留关键词、去掉无用杂质词，统计出来全是“的”“了”！请提示他先进行“保留关键词”。');
      return;
    }
    if (step >= 3) return;
    setManualCountPreview({});
    setActiveTask(3);
    setFailCount(0);
  };

  const autoStep3 = () => {
    setWithLoading(3, '算盘敲得飞起，正在统计词频...');
    setActiveTask(null);
    const counts: Record<string, number> = {};
    cleaned.forEach(w => counts[w] = (counts[w] || 0) + 1);
    const result = Object.keys(counts).map(k => ({text: k, count: counts[k]})).sort((a,b) => b.count-a.count).slice(0, 100);
    setWordFreq(result);
    setStep(3);
    playSuccess();
    triggerAI('词频统计完成！先看看哪些词出现次数最多，再点击“下一步”。');
    setIsLoadingStep(null);
  };

  const handleStep4 = () => {
    if (step < 3) {
      triggerAI('还没拿到词频数据呢，无法合并同义词。请先完成词频统计。');
      return;
    }
    if (step >= 4) return;
    setManualMergeIds([]);
    setActiveTask(4);
    setFailCount(0);
  };

  const autoStep4 = async () => {
    setWithLoading(4, '正在合并同义词和相同指代...');
    setActiveTask(null);
    try {
      const res = await processTextWithAI(`下面是词频表，请合并指代同一人物、地点或事物的同义词和近义词，比如“悟空/孙悟空/大圣”统一为“孙悟空”。只返回 JSON 数组，格式为 [{"text":"词语","count":数字}]，不要解释：\n${JSON.stringify(wordFreq.slice(0, 80))}`);
      setWordFreq(parseMergedWordFreq(res));
      setStep(4);
      playSuccess();
      triggerAI('同义词合并完成！先看看合并后的词频表，再点击“下一步”完成最后判断。');
    } catch {
      setStep(4);
      playSuccess();
      triggerAI('网络有点挤，俺老孙先保留当前词频表。请先看看结果，再点击“下一步”完成最后判断。');
    } finally {
      setIsLoadingStep(null);
    }
  };

  const handleStep5 = () => {
    if (step < 4) {
      triggerAI('还没有合并同义词，词云图会不够准确。请先完成“合并同义词”。');
      return;
    }
    if (step >= 5) return;
    setStep(5);
    playSuccess();
    setTimeout(() => {
      if (canvasRef.current && wordFreq.length > 0) {
        drawWordCloud(canvasRef.current, wordFreq);
      }
    }, 100);
    triggerAI('恭喜学生完成了全流程！');
  };

  const practiceSplitText = pickPracticeSentence(rawText);
  const countPracticeWords = cleaned.slice(0, 24);
  const mergePracticeItems = wordFreq.slice(0, 12);
  const limitText = practiceSplitText;
  const manualSplitIds = manualSplitText.split(',').filter(Boolean);
  const segments = useMemo(() => {
    if (!manualSplitText) return [limitText];
    const cuts = manualSplitText.split(',').map(Number).sort((a,b) => a-b);
    const segs = [];
    let start = 0;
    for (const c of cuts) {
       segs.push(limitText.slice(start, c+1));
       start = c+1;
    }
    if (start < limitText.length) segs.push(limitText.slice(start));
    return segs;
  }, [limitText, manualSplitText]);

  const keptPracticeWords = practiceWords.filter((_, index) => !manualRemovedKeywordIds.includes(index));
  const removedPracticeWords = practiceWords.filter((_, index) => manualRemovedKeywordIds.includes(index));
  const manualCountItems = (Object.entries(manualCountPreview) as [string, number][])
    .sort((a, b) => b[1] - a[1]);
  const manualMergeItems = mergePracticeItems.filter((_, index) => manualMergeIds.includes(index));

  return (
    <div className="flex flex-col max-w-6xl mx-auto py-8 px-4 relative min-h-screen">
      {hasCompletedBefore && onGoToStage8Password && (
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onGoToStage8Password}
          className="fixed right-5 bottom-5 z-[90] max-w-[280px] rounded-2xl border border-brand-gold/45 bg-brand-gold/95 px-5 py-3 text-left text-black shadow-[0_10px_30px_rgba(255,215,0,0.35)] transition-transform hover:scale-[1.03]"
        >
          <span className="block text-sm font-black">已完成实战演练</span>
          <span className="block text-xs font-bold opacity-80">拿到老师密码后，点这里去第八关输入密码</span>
        </motion.button>
      )}
      
      {/* Intro Modal Overlay */}
      <AnimatePresence>
        {showIntroModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-bg-deep/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-glass border border-brand-gold/50 rounded-2xl p-8 max-w-2xl w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
               <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-6 text-center">
                 第七关操作说明
               </h2>
               <div className="text-white/80 space-y-4 mb-8 text-lg">
                 <p>这一关要自己完成一次完整的词云图流程。每一步先判断该做什么，选对后进入对应环节。</p>
                 <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
                   <p className="flex items-center gap-2"><span className="text-2xl">✂️</span> <b>分词</b>：把文章切成一个个词。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">🧹</span> <b>保留关键词</b>：去掉没用的词，留下重点词。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">🧮</span> <b>词频统计</b>：数一数每个词出现几次。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">🔗</span> <b>合并同义词</b>：把同一个意思的词合到一起。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">✨</span> <b>生成词云图</b>：用整理好的数据画图。</p>
                 </div>
                 <p className="text-brand-cyan font-bold italic mt-4 text-center">进入环节后，只需要点击 AI 按钮处理；处理完看 15 秒效果，再手动点击按钮选择下一步。</p>
               </div>
               <Button onClick={() => setShowIntroModal(false)} className="w-full py-4 text-xl shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                 我已了解如何操作
               </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay Modal */}
      <AnimatePresence>
        {(isLoadingStep || isGeneratingText) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-deep/80 backdrop-blur-md"
          >
            <div className="w-24 h-24 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(255,215,0,0.3)]"></div>
            <motion.p 
              animate={{ opacity: [0.5, 1, 0.5] }} 
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl font-bold text-brand-gold drop-shadow-md"
            >
              {isGeneratingText ? '正在施展灵动分身，从天界抓取一段文字素材...' : loadingMessage}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next-step Choice Modal */}
      <AnimatePresence>
        {flowChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] flex items-center justify-center bg-bg-deep/82 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 18 }}
              className="bg-glass border border-brand-cyan/45 rounded-2xl p-6 max-w-2xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
            >
              <h3 className="text-2xl font-bold text-brand-gold mb-2 text-center">{flowChoice.title}</h3>
              <p className="text-white/68 text-sm text-center mb-5">请选择这一环节应该做的操作。选对后才会进入对应实操。</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FLOW_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => chooseFlowAction(action.id)}
                    className="bg-white/8 hover:bg-brand-cyan/18 border border-white/12 hover:border-brand-cyan/50 rounded-xl px-4 py-3 text-left transition-colors"
                  >
                    <span className="text-lg mr-2">{action.icon}</span>
                    <span className="font-bold text-white">{action.label}</span>
                  </button>
                ))}
              </div>
              {flowChoice.analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 bg-brand-red/14 border border-brand-red/45 rounded-xl p-4 text-sm text-white/86 leading-relaxed"
                >
                  <b className="text-brand-red">分析：</b>{flowChoice.analysis}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-8 text-center">第七关：实战演练！全流程召唤词云</h2>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8 w-full">
        <div className="flex-1 bg-glass p-6 rounded-2xl flex flex-col gap-4">
           <h3 className="font-bold text-lg text-brand-cyan">原始文本池</h3>
           <textarea 
             disabled={step > 0 || isGeneratingText}
             value={rawText}
             onChange={(e) => {
               setRawText(e.target.value);
               setSourceLabel('学生自填文本');
             }}
             style={{ height: articleTextHeight }}
             className="w-full min-h-[360px] bg-black/50 border border-white/20 rounded-xl p-4 text-white leading-relaxed resize-none overflow-hidden focus:outline-none focus:border-brand-gold disabled:opacity-75"
             placeholder="请将你需要分析的一段新闻、故事或者作文粘贴到这里..."
           />
           {step === 0 && (
             <div className="flex flex-col gap-3 mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {['西游记', '三国演义', '水浒传', '红楼梦'].map(book => (
                    <button 
                      key={book}
                      onClick={() => generateSampleText(book, true)} 
                      disabled={isGeneratingText}
                      className="px-3 py-1.5 text-sm bg-brand-gold/20 hover:bg-brand-gold/40 text-brand-gold border border-brand-gold/30 rounded-lg transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      📖 {book}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {['童话故事', '科幻小说', '风景游记'].map(genre => (
                    <button 
                      key={genre}
                      onClick={() => generateSampleText(genre)} 
                      disabled={isGeneratingText}
                      className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      📝 {genre}
                    </button>
                  ))}
                </div>
             </div>
           )}
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
           {/* Pipeline tools */}
           <div className="flex flex-row items-center gap-1 flex-none bg-black/20 p-2 rounded-xl border border-white/10 overflow-x-auto">
             <button onClick={openCurrentNextChoice} className={`py-2 px-1 flex-1 min-w-[72px] rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 1 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                ✂️ 文本分词
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={openCurrentNextChoice} className={`py-2 px-1 flex-1 min-w-[72px] rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 2 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                🧹 保留关键词
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={openCurrentNextChoice} className={`py-2 px-1 flex-1 min-w-[72px] rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 3 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                🧮 词频统计
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={openCurrentNextChoice} className={`py-2 px-1 flex-1 min-w-[72px] rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 4 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                🔗 合并同义词
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={openCurrentNextChoice} className={`py-2 px-1 flex-1 min-w-[72px] rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 5 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                ✨ 生成词云图
             </button>
           </div>
           
           <div className="bg-glass flex-1 rounded-2xl p-4 flex flex-col overflow-hidden min-h-[500px]">
                <h3 className="font-bold text-sm text-brand-cyan mb-3">状态面板</h3>
                <div className="flex-1 overflow-y-auto text-sm text-white/80 space-y-3">
                  {activeTask === 1 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold text-base">🛠️ 实操小体验：试着给这句短话分分词吧！</p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white/60">
                         <b>原理：</b>计算机无法直接处理整句，需按语义切分为独立词语（如“词云图”切为“词云/图”）。
                      </div>
                      <p className="text-white/70 text-xs italic">下面短句从左侧文章中抽取，先试着切一切；30 秒后大圣按钮会抖动提醒。</p>
                      <div className="bg-black/30 p-4 rounded-xl flex flex-wrap items-center mt-2 cursor-crosshair">
                         {practiceSplitText.split('').map((char, i, arr) => (
                            <React.Fragment key={i}>
                              <span className="text-xl font-bold bg-white/5 py-1 px-0.5 rounded select-none text-white">{char}</span>
                              {i < arr.length - 1 && (
                                <div 
                                  onClick={() => {
                                    pulseManualFeedback(`split-${i}`);
                                    if (!manualSplitIds.includes(i.toString())) {
                                      setManualSplitText(prev => prev ? prev + ',' + i : i.toString());
                                    } else {
                                      setManualSplitText(prev => prev.split(',').filter(x => x !== i.toString()).join(','));
                                    }
                                  }}
                                  className="w-4 h-8 flex items-center justify-center hover:bg-brand-gold/50 cursor-pointer group transition-colors rounded mx-[1px]"
                                >
                                  <div className={`w-[2px] h-[60%] transition-all ${manualFeedbackIds.includes(`split-${i}`) ? 'bg-brand-cyan w-2 h-[92%] shadow-[0_0_16px_rgba(26,188,156,0.9)]' : manualSplitIds.includes(i.toString()) ? 'bg-brand-gold shadow-[0_0_8px_#ffd700]' : 'bg-transparent group-hover:bg-brand-gold'}`} />
                                </div>
                              )}
                            </React.Fragment>
                         ))}
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-xs text-brand-cyan font-bold mb-2">你的分词结果预览</p>
                        <div className="flex flex-wrap gap-2">
                          {segments.filter(Boolean).map((segment, index) => (
                            <span key={`${segment}-${index}`} className="bg-brand-gold/16 border border-brand-gold/28 text-brand-gold px-2.5 py-1 rounded-lg">
                              {segment}
                            </span>
                          ))}
                        </div>
                      </div>
                      <motion.button onClick={autoStep1} {...assistButtonProps('gold')}>
                        ✨ 让大圣帮助自动全篇分词
                      </motion.button>
                      <p className="text-center text-[11px] text-white/45">{assistHint}</p>
                    </div>
                  )}
                  
                  {activeTask === 2 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold text-base">🧹 实操小体验：保留关键词</p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white/60">
                         <b>原理：</b>停用词（的、了、在）出现极多但无实质意义，过滤它们能突出核心关键词。
                      </div>
                      <p className="text-white/70 text-xs">这些词从整篇文章的分词结果中抽取。点击暂时不重要的词，把它放进“暂时去掉区”。</p>
                      <div className="flex flex-wrap gap-2 py-2">
                        {practiceWords.map((w, i) => (
                          <motion.span
                            key={i}
                            onClick={() => toggleManualKeyword(i)}
                            animate={manualFeedbackIds.includes(`keyword-${i}`) ? { scale: [1, 1.14, 1], y: [0, -4, 0] } : {}}
                            className={`cursor-pointer px-3 py-1.5 rounded text-white transition-colors ${
                              manualRemovedKeywordIds.includes(i)
                                ? 'bg-brand-red/20 text-white/45 line-through border border-brand-red/25'
                                : manualFeedbackIds.includes(`keyword-${i}`)
                                  ? 'bg-brand-cyan/30 ring-2 ring-brand-cyan shadow-[0_0_14px_rgba(26,188,156,0.45)]'
                                  : 'bg-white/10 hover:bg-white/18'
                            }`}
                          >
                            {w}
                          </motion.span>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[#2ecc71]/10 border border-[#2ecc71]/25 rounded-xl p-3">
                          <p className="text-xs font-bold text-[#2ecc71] mb-2">保留区</p>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            {keptPracticeWords.slice(0, 18).map((w, index) => (
                              <span key={`${w}-kept-${index}`} className="bg-white/10 px-2 py-1 rounded">{w}</span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-brand-red/10 border border-brand-red/25 rounded-xl p-3">
                          <p className="text-xs font-bold text-brand-red mb-2">暂时去掉区</p>
                          <div className="flex flex-wrap gap-1.5 text-xs min-h-6">
                            {removedPracticeWords.length > 0 ? removedPracticeWords.map((w, index) => (
                              <span key={`${w}-removed-${index}`} className="bg-brand-red/18 px-2 py-1 rounded">{w}</span>
                            )) : <span className="text-white/45">还没有选择词语</span>}
                          </div>
                        </div>
                      </div>
                      <motion.button onClick={autoStep2} {...assistButtonProps('cyan')}>
                        ✨ 让大圣帮忙自动保留整篇关键词！
                      </motion.button>
                      <p className="text-center text-[11px] text-white/45">{assistHint}</p>
                    </div>
                  )}
                  
                  {activeTask === 3 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold text-base">🧮 实操小体验：肉眼算盘</p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white/60">
                         <b>原理：</b>通过频次计数确定权重，高频词在图形中将被绘制得更大、更显眼。
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">这些词从关键词结果中抽取。点击词语试着数次数，下方会显示你的计数。</p>
                      <div className="bg-black/30 p-2 rounded flex flex-wrap gap-2">
                        {countPracticeWords.map((w, i) => (
                          <motion.span
                            key={`${w}-${i}`}
                            onClick={() => addManualCount(w, i)}
                            animate={manualFeedbackIds.includes(`count-${i}`) ? { scale: [1, 1.16, 1] } : {}}
                            className={`cursor-pointer rounded px-2 py-1 transition-colors ${
                              manualFeedbackIds.includes(`count-${i}`)
                                ? 'bg-brand-gold/30 text-brand-gold ring-2 ring-brand-gold'
                                : 'bg-white/8 text-white/65 hover:bg-white/15'
                            }`}
                          >
                            {w}
                          </motion.span>
                        ))}
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-xs text-brand-cyan font-bold mb-2">你的词频小表</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {manualCountItems.length > 0 ? manualCountItems.slice(0, 12).map(([word, count]) => (
                            <div key={word} className="flex items-center justify-between rounded-lg bg-black/25 px-2 py-1.5">
                              <span className="text-white/80">{word}</span>
                              <span className="font-bold text-brand-gold">{count}</span>
                            </div>
                          )) : <p className="col-span-full text-white/45">点击上面的词，试着数一数。</p>}
                        </div>
                      </div>
                      <motion.button onClick={autoStep3} {...assistButtonProps('gold')}>
                        ✨ 让大圣帮助自动统计全局
                      </motion.button>
                      <p className="text-center text-[11px] text-white/45">{assistHint}</p>
                    </div>
                  )}

                  {activeTask === 4 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold text-base">🔗 实操小体验：合并同义词</p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white/60">
                         <b>原理：</b>同一个人物或事物可能有不同叫法。合并后，词云图里的重点才不会被拆散。
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">这些词从词频表中抽取。点击你觉得意思相近的词，把它们放进合并篮。</p>
                      <div className="flex flex-wrap gap-2 py-2">
                        {mergePracticeItems.map((w, i) => (
                          <motion.span
                            key={i}
                            onClick={() => toggleManualMerge(i)}
                            animate={manualFeedbackIds.includes(`merge-${i}`) ? { scale: [1, 1.13, 1], rotate: [0, -1, 1, 0] } : {}}
                            className={`cursor-pointer px-2 py-1 rounded text-white transition-colors ${
                              manualMergeIds.includes(i)
                                ? 'bg-brand-cyan/25 ring-2 ring-brand-cyan shadow-[0_0_14px_rgba(26,188,156,0.45)]'
                                : manualFeedbackIds.includes(`merge-${i}`)
                                  ? 'bg-brand-gold/25 ring-2 ring-brand-gold'
                                  : 'bg-white/10 hover:bg-white/18'
                            }`}
                          >
                            {w.text} <span className="text-white/55 text-xs">({w.count})</span>
                          </motion.span>
                        ))}
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-xs text-brand-cyan font-bold mb-2">同义词合并篮</p>
                        <div className="flex flex-wrap gap-2 min-h-8">
                          {manualMergeItems.length > 0 ? manualMergeItems.map(item => (
                            <span key={item.text} className="bg-brand-cyan/18 border border-brand-cyan/25 text-white px-2.5 py-1 rounded-lg">
                              {item.text}<span className="text-white/50 text-xs ml-1">x{item.count}</span>
                            </span>
                          )) : <span className="text-xs text-white/45">点击上面的词，把相近的词放到这里。</span>}
                        </div>
                      </div>
                      <motion.button onClick={autoStep4} {...assistButtonProps('cyan')}>
                        ✨ 让大圣帮助自动合并同义词
                      </motion.button>
                      <p className="text-center text-[11px] text-white/45">{assistHint}</p>
                    </div>
                  )}

                  {!activeTask && step === 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="opacity-60">先阅读左侧文本，15 秒后点击下面按钮判断第一步应该做什么。</p>
                      <button
                        onClick={openCurrentNextChoice}
                        disabled={isReviewLocked}
                        className={`w-full py-3 font-bold rounded-xl transition-all ${
                          isReviewLocked
                            ? 'bg-white/10 text-white/55 cursor-not-allowed border border-white/10'
                            : 'bg-brand-cyan/90 hover:bg-brand-cyan text-black shadow-[0_0_15px_rgba(26,188,156,0.35)]'
                        }`}
                      >
                        {isReviewLocked ? `请先阅读全文，${reviewRemaining}s 后开始` : '开始选择第一步'}
                      </button>
                    </div>
                  )}
                  {!activeTask && step >= 1 && step < 3 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold">{step === 1 ? '分词效果' : '关键词保留效果'}</p>
                      <div className="flex flex-wrap gap-2 items-start justify-start">
                        {(step === 1 ? words : cleaned).map((w,i) => <span key={i} className="bg-white/10 px-2 py-1 rounded">{w}</span>)}
                      </div>
                      <button
                        onClick={openCurrentNextChoice}
                        disabled={isReviewLocked}
                        className={`mt-2 w-full py-3 font-bold rounded-xl transition-all ${
                          isReviewLocked
                            ? 'bg-white/10 text-white/55 cursor-not-allowed border border-white/10'
                            : 'bg-brand-cyan/90 hover:bg-brand-cyan text-black shadow-[0_0_15px_rgba(26,188,156,0.35)]'
                        }`}
                      >
                        {isReviewLocked ? `请先观察效果，${reviewRemaining}s 后可继续` : '继续选择下一步'}
                      </button>
                    </div>
                  )}
                  {!activeTask && step >= 3 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold">{step === 3 ? '词频统计结果' : step === 4 ? '同义词合并结果' : '最终词频结果'}</p>
                      <div className="flex flex-wrap gap-2 items-start justify-start">
                        {wordFreq.slice(0, 30).map((w,i) => <span key={i} className="bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2 py-1 rounded">{w.text} <span className="text-white/60 text-xs">({w.count})</span></span>)}
                      </div>
                      {step < 5 && (
                        <button
                          onClick={openCurrentNextChoice}
                          disabled={isReviewLocked}
                          className={`mt-2 w-full py-3 font-bold rounded-xl transition-all ${
                            isReviewLocked
                              ? 'bg-white/10 text-white/55 cursor-not-allowed border border-white/10'
                              : 'bg-brand-cyan/90 hover:bg-brand-cyan text-black shadow-[0_0_15px_rgba(26,188,156,0.35)]'
                          }`}
                        >
                          {isReviewLocked ? `请先观察效果，${reviewRemaining}s 后可继续` : '继续选择下一步'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
           </div>
        </div>
      </div>
      
      {/* Canvas Area */}
      {step >= 5 && (
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
           <div className="bg-[#140A28] border-2 border-brand-gold rounded-[24px] p-4 shadow-[0_10px_40px_rgba(255,215,0,0.3)]">
             <canvas 
               ref={canvasRef} 
               width={800} 
               height={400}
             />
           </div>
           <Button onClick={() => {
             const imgData = canvasRef.current?.toDataURL('image/png');
             const { articleTitle, articleBody } = parseArticleContent();
             onComplete(50, {
               sourceLabel,
               articleTitle,
               articleBody,
               rawTextFull: rawText,
               rawTextPreview: articleBody.slice(0, 180),
               segmentedWords: words,
               cleanedWords: cleaned,
               finalWordFreq: wordFreq,
               wordCloudImage: imgData,
               generatedBy: playerName,
               flowMistakes,
             });
           }} className="mt-8 px-10 py-4 text-xl">
              进入终极试炼（知识测验） 🏆
           </Button>
        </motion.div>
      )}
    </div>
  );
};
