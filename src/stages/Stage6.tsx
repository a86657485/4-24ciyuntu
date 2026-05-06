import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/Button';
import { drawWordCloud } from '../utils/canvas';
import { useAI } from '../contexts/AIContext';

const DEEPSEEK_API_KEY = "sk-eb65e011c69a4e1cb667eecdfce990a8";

interface Props {
  onComplete: (score: number, extraData?: any) => void;
  playerName: string;
}

export const Stage6: React.FC<Props> = ({ onComplete, playerName }) => {
  const { triggerAI } = useAI();
  const [showIntroModal, setShowIntroModal] = useState(true);
  const [rawText, setRawText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('学生自选文本');
  const [step, setStep] = useState(0); // 0:input, 1:segmented, 2:cleaned, 3:counted, 4:cloud
  
  const [words, setWords] = useState<string[]>([]);
  const [cleaned, setCleaned] = useState<string[]>([]);
  const [wordFreq, setWordFreq] = useState<{text: string, count: number}[]>([]);
  
  const [isLoadingStep, setIsLoadingStep] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [failCount, setFailCount] = useState(0);

  const setWithLoading = (stepNum: number, msg: string) => {
    setIsLoadingStep(stepNum);
    setLoadingMessage(msg);
  };
  
  const [manualSplitText, setManualSplitText] = useState('');
  const [practiceWords, setPracticeWords] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('API Exception');
      const data = await res.json();
      return data.choices[0].message.content;
    } catch (e) {
      clearTimeout(timeoutId);
      throw new Error('Connection or Timeout Error');
    }
  };

  const processTextWithAI = async (prompt: string) => {
    const reply = await callDeepSeek(prompt);
    return reply;
  };

  const generateSampleText = async (type: string, isClassic: boolean = false) => {
    if (step > 0) return;
    setIsGeneratingText(true);
    setSourceLabel(isClassic ? `名著片段 · ${type}` : `AI 生成素材 · ${type}`);
    setRawText('大圣正在施展分身法替你搬运文章中，大约需要几秒钟...');
    try {
      let prompt = '';
      if (isClassic) {
        prompt = `请摘录一段中国古典四大名著《${type}》原著中的经典片段（字数严格限制在300字到400字之间）。\n要求：\n1. 真实原文。\n2. 第一行必须是提炼出的题目。\n3. 第二行开始直接输出原文片段。\n4. 不要多余解释。`;
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
      triggerAI('太棒了，分词完成！接下来请点击下一步【过滤清洗】');
    } catch (e) {
      triggerAI('API调用太拥挤啦，一直施法中失败了，请引导学生重新点击自动分词尝试！');
    } finally {
      setIsLoadingStep(null);
    }
  };

  const handleStep2 = () => {
    if (step < 1) return triggerAI('学生跳过了分词，直接想过滤清洗。请大声提示他必须先完成第一步分词！');
    if (step >= 2) return;
    setPracticeWords(words.slice(0, 30));
    setActiveTask(2);
    setFailCount(0);
  };

  const autoStep2 = async () => {
    setWithLoading(2, '正在施展净水术，清洗停用词...');
    setActiveTask(null);
    try {
      const res = await processTextWithAI(`下面是已经分好词的文本，请彻底过滤掉无用的停用词（如的、了、在、是、和、就），并将指代相同事物的词语统一合并为同一个词。仅返回处理后用空格分隔的词语，不要任何解释：\n${words.slice(0, 300).join(' ')}`);
      setCleaned(res.split(/[\s,，。、]+/).filter(w => w.trim().length > 0));
      setStep(2);
      playSuccess();
      triggerAI('清洗大成功！脏东西全没了。快来点击第三步【词频统计】吧！');
    } catch {
      triggerAI('网络清洗发生波动，请让学生再试一次。');
    } finally {
      setIsLoadingStep(null);
    }
  };

  const handleStep3 = () => {
    if (step < 2) {
      if (step === 0) triggerAI('还没分词和清洗呢，怎么能直接统计！请提示他按顺序先分词。');
      else triggerAI('还没有过滤清洗掉无用的杂质词，统计出来全是“的”“了”！请提示他先进行“过滤清洗”。');
      return;
    }
    if (step >= 3) return;
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
    triggerAI('数据出炉！谁出现的次数最多？来点终极魔法，点击【召唤词云】！');
    setIsLoadingStep(null);
  };

  const handleStep4 = () => {
    if (step < 3) {
      triggerAI('还没拿到词频数据呢，词云图没法生成！请引导他看清当前卡在了哪一步，要先测算词频。');
      return;
    }
    if (step >= 4) return;
    setStep(4);
    playSuccess();
    setTimeout(() => {
      if (canvasRef.current && wordFreq.length > 0) {
        drawWordCloud(canvasRef.current, wordFreq);
      }
    }, 100);
    triggerAI('恭喜学生完成了全流程！');
  };

  const limitText = rawText.slice(0, 40);
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

  return (
    <div className="flex flex-col max-w-6xl mx-auto py-8 px-4 relative min-h-screen">
      
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
                 🐉 欢迎来到【全流程实战实验室】
               </h2>
               <div className="text-white/80 space-y-4 mb-8 text-lg">
                 <p>前面的关卡中，你已经学会了魔法词云的各个独立部件。现在，你要将它们组合成一条全自动流水线！</p>
                 <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
                   <p className="flex items-center gap-2"><span className="text-2xl">✂️</span> <b>第一步：文本分词</b> - 将长篇大论切成词语小块。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">🧹</span> <b>第二步：过滤清洗</b> - 扔掉“的”、“了”等没有用的杂质词。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">🧮</span> <b>第三步：词频统计</b> - 数一数哪个词出现的次数最多。</p>
                   <p className="flex items-center gap-2"><span className="text-2xl">✨</span> <b>第四步：召唤词云</b> - 让数据化作美丽的云图！</p>
                 </div>
                 <p className="text-brand-cyan font-bold italic mt-4 text-center">只有严格按照流水线顺序，才能召唤出最完美的词云哦！</p>
               </div>
               <Button onClick={() => setShowIntroModal(false)} className="w-full py-4 text-xl shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                 我已了解，立即进入实战！
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

      <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-8 text-center">第六关：实战演练！全流程召唤词云</h2>
      
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
             className="w-full h-40 bg-black/50 border border-white/20 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-brand-gold disabled:opacity-50"
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
                      className="px-3 py-1.5 text-sm bg-brand-gold/20 hover:bg-brand-gold/40 text-brand-gold border border-brand-gold/30 rounded-lg transition-colors disabled:opacity-50"
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
                      className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors disabled:opacity-50"
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
           <div className="flex flex-row items-center gap-1 flex-none bg-black/20 p-2 rounded-xl border border-white/10">
             <button onClick={handleStep1} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 1 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                ✂️ 文本分词
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={handleStep2} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 2 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                🧹 过滤清洗
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={handleStep3} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 3 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                🧮 词频统计
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={handleStep4} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border ${step >= 4 ? 'bg-[#2ecc71]/40 border-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                ✨ 召唤词云
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
                      <p className="text-white/70 text-xs italic">阅读下面的短句，点缝隙切词！</p>
                      <div className="bg-black/30 p-4 rounded-xl flex flex-wrap items-center mt-2 cursor-crosshair">
                         {rawText.slice(0, 40).split('').map((char, i, arr) => (
                            <React.Fragment key={i}>
                              <span className="text-xl font-bold bg-white/5 py-1 px-0.5 rounded select-none text-white">{char}</span>
                              {i < arr.length - 1 && (
                                <div 
                                  onClick={() => {
                                    if (!manualSplitText.includes(i.toString())) {
                                      setManualSplitText(prev => prev ? prev + ',' + i : i.toString());
                                    } else {
                                      setManualSplitText(prev => prev.split(',').filter(x => x !== i.toString()).join(','));
                                    }
                                  }}
                                  className="w-4 h-8 flex items-center justify-center hover:bg-brand-gold/50 cursor-pointer group transition-colors rounded mx-[1px]"
                                >
                                  <div className={`w-[2px] h-[60%] transition-colors ${manualSplitText.split(',').includes(i.toString()) ? 'bg-brand-gold shadow-[0_0_8px_#ffd700]' : 'bg-transparent group-hover:bg-brand-gold'}`} />
                                </div>
                              )}
                            </React.Fragment>
                         ))}
                      </div>
                      <button onClick={autoStep1} className="mt-2 w-full py-3 bg-brand-gold/90 hover:bg-brand-gold text-black font-bold rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.5)] transition-all transform hover:scale-[1.02]">✨ 让大圣帮助自动全篇分词</button>
                    </div>
                  )}
                  
                  {activeTask === 2 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold text-base">🧹 实操小体验：清洗多余杂质</p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white/60">
                         <b>原理：</b>停用词（的、了、在）出现极多但无实质意义，过滤它们能突出核心关键词。
                      </div>
                      <p className="text-white/70 text-xs">点击你认为是无意义的“停用词”将它们抹去。</p>
                      <div className="flex flex-wrap gap-2 py-2">
                        {practiceWords.map((w, i) => (
                          <span key={i} onClick={() => setPracticeWords(prev => prev.filter((_, idx) => idx !== i))} className="cursor-pointer hover:bg-brand-red bg-white/10 px-3 py-1.5 rounded transition-colors text-white">{w}</span>
                        ))}
                      </div>
                      <button onClick={autoStep2} className="mt-2 w-full py-3 bg-brand-cyan/90 hover:bg-brand-cyan text-black font-bold rounded-xl shadow-[0_0_15px_rgba(26,188,156,0.4)] transition-all transform hover:scale-[1.02]">✨ 让大圣帮忙自动清洗整篇后文！</button>
                    </div>
                  )}
                  
                  {activeTask === 3 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-brand-gold font-bold text-base">🧮 实操小体验：肉眼算盘</p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white/60">
                         <b>原理：</b>通过频次计数确定权重，高频词在图形中将被绘制得更大、更显眼。
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">你能找出哪一个词出现最多吗？</p>
                      <p className="bg-black/30 p-2 rounded text-white/50">{cleaned.slice(0, 40).join(' ')}...</p>
                      <div className="flex gap-2 w-full">
                         <input className="flex-1 bg-white/5 border border-white/20 p-2 rounded text-white" placeholder="哪个词出现最多？" />
                         <input type="number" className="w-24 bg-white/5 border border-white/20 p-2 rounded text-white" placeholder="猜次数" />
                      </div>
                      <button 
                         onClick={() => {
                           setFailCount(f => {
                             const n = f + 1;
                             if (n >= 3) triggerAI('算不过来也没关系，俺老孙这就开坛设祭，让超级算盘测算全局！');
                             return n;
                           });
                           autoStep3();
                         }} 
                         className="mt-2 w-full py-3 bg-brand-gold/90 hover:bg-brand-gold text-black font-bold rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all transform hover:scale-[1.02]"
                      >✨ 让大圣帮助自动统计全局</button>
                    </div>
                  )}

                  {!activeTask && step === 0 && <p className="opacity-50">等待执行步骤...</p>}
                  {!activeTask && step >= 1 && step < 3 && (
                    <div className="flex flex-wrap gap-2 items-start justify-start">
                      {(step === 1 ? words : cleaned).map((w,i) => <span key={i} className="bg-white/10 px-2 py-1 rounded">{w}</span>)}
                    </div>
                  )}
                  {!activeTask && step >= 3 && (
                    <div className="flex flex-wrap gap-2 items-start justify-start">
                      {wordFreq.slice(0, 30).map((w,i) => <span key={i} className="bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2 py-1 rounded">{w.text} <span className="text-white/60 text-xs">({w.count})</span></span>)}
                    </div>
                  )}
                </div>
           </div>
        </div>
      </div>
      
      {/* Canvas Area */}
      {step >= 4 && (
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
             });
           }} className="mt-8 px-10 py-4 text-xl">
              进入终极试炼（知识测验） 🏆
           </Button>
        </motion.div>
      )}
    </div>
  );
};
