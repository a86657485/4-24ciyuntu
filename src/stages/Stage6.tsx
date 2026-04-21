import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/Button';
import { drawWordCloud } from '../utils/canvas';
import { useAI } from '../contexts/AIContext';

const QWEN_API_KEY = "sk-a6ba686f91e34fe087240b3043041e51";

interface Props {
  onComplete: () => void;
  playerName: string;
}

export const Stage6: React.FC<Props> = ({ onComplete, playerName }) => {
  const { triggerAI, showLoading, hideLoading } = useAI();
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState(0); // 0:input, 1:segmented, 2:cleaned, 3:counted, 4:cloud
  
  const [words, setWords] = useState<string[]>([]);
  const [cleaned, setCleaned] = useState<string[]>([]);
  const [wordFreq, setWordFreq] = useState<{text: string, count: number}[]>([]);
  
  const [isLoadingStep, setIsLoadingStep] = useState<number | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [manualSplitText, setManualSplitText] = useState('');
  const [practiceWords, setPracticeWords] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const callLLM = async (prompt: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout limit
    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen-plus',
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
    const reply = await callLLM(prompt);
    return reply;
  };

  const generateSampleText = async (type: string, isClassic: boolean = false) => {
    if (step > 0) return;
    setIsGeneratingText(true);
    setRawText('大圣正在施展分身法替你搬运文章中，大约需要几秒钟...');
    showLoading('大圣施法：文章搬运中...');
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
      hideLoading();
    }
  };

  const handleStep1 = () => {
    if (!rawText.trim()) return triggerAI('学生连文本都没输入就想分词，请提示他先在下面文本框输入或拷贝一段文章。');
    if (step >= 1) return;
    setActiveTask(1);
  };

  const autoStep1 = async () => {
    setIsLoadingStep(1);
    setActiveTask(null);
    showLoading('大圣施法：自动分词中...');
    try {
      const res = await processTextWithAI(`请对以下文本进行中文分词，仅返回用空格分隔的词语，不要任何解释和其他文字，过滤掉常见标点符号：\n${rawText.slice(0, 400)}`);
      setWords(res.split(/[\s,，。、]+/).filter(w => w.trim().length > 0));
      setStep(1);
    } catch (e) {
      triggerAI('API调用太拥挤啦，一直施法中失败了，请引导学生重新点击自动分词尝试！');
    } finally {
      setIsLoadingStep(null);
      hideLoading();
    }
  };

  const handleStep2 = () => {
    if (step < 1) return triggerAI('学生跳过了分词，直接想过滤清洗。请大声提示他必须先完成第一步分词！');
    if (step >= 2) return;
    setPracticeWords(words.slice(0, 30));
    setActiveTask(2);
  };

  const autoStep2 = async () => {
    setIsLoadingStep(2);
    setActiveTask(null);
    showLoading('大圣施法：过滤清洗中...');
    try {
      const res = await processTextWithAI(`下面是已经分好词的文本，请彻底过滤掉无用的停用词（如的、了、在、是、和、就），并将指代相同事物的词语统一合并为同一个词。仅返回处理后用空格分隔的词语，不要任何解释：\n${words.slice(0, 300).join(' ')}`);
      setCleaned(res.split(/[\s,，。、]+/).filter(w => w.trim().length > 0));
      setStep(2);
    } catch {
      triggerAI('网络清洗发生波动，请让学生再试一次。');
    } finally {
      setIsLoadingStep(null);
      hideLoading();
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
  };

  const autoStep3 = async () => {
    setIsLoadingStep(3);
    setActiveTask(null);
    showLoading('大圣算盘：词频统计中...');
    
    // Simulate real thought time
    await new Promise(r => setTimeout(r, 1500));

    const counts: Record<string, number> = {};
    cleaned.forEach(w => counts[w] = (counts[w] || 0) + 1);
    const result = Object.keys(counts).map(k => ({text: k, count: counts[k]})).sort((a,b) => b.count-a.count).slice(0, 100);
    setWordFreq(result);
    setStep(3);
    setIsLoadingStep(null);
    hideLoading();
  };

  const handleStep4 = () => {
    if (step < 3) {
      triggerAI('还没拿到词频数据呢，词云图没法生成！请引导他看清当前卡在了哪一步，要先测算词频。');
      return;
    }
    if (step >= 4) return;
    setStep(4);
    setTimeout(() => {
      if (canvasRef.current && wordFreq.length > 0) {
        drawWordCloud(canvasRef.current, wordFreq);
      }
    }, 100);
    triggerAI('学生成功生成了最终的词云！请用孙悟空的语气大力夸奖他！并提问：“回顾一下，我们这节课把一段话变成词云图，是按顺序经过了哪四个步骤？” 引导他总结本节课的四大重难点步骤：分词、清洗、统计、生成云图。');
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
      <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-8 text-center">第六关：实战演练！全流程召唤词云</h2>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8 w-full">
        <div className="flex-1 bg-glass p-6 rounded-2xl flex flex-col gap-4">
           <h3 className="font-bold text-lg text-brand-cyan">原始文本池</h3>
           <textarea 
             disabled={step > 0 || isGeneratingText}
             value={rawText}
             onChange={(e) => setRawText(e.target.value)}
             className="w-full h-40 bg-black/50 border border-white/20 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-brand-gold disabled:opacity-50"
             placeholder="请将你需要分析的一段新闻、故事或者作文粘贴到这里..."
           />
           {step === 0 && (
             <div className="flex flex-col gap-3 mt-2">
               <span className="text-sm text-white/50 leading-none">从四大名著提取经典原文 (600-800字)：</span>
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
               
               <span className="text-sm text-white/50 leading-none mt-1">或生成其他题材的长文 (600-800字)：</span>
               <div className="flex flex-wrap items-center gap-2">
                 <button 
                   onClick={() => generateSampleText('童话故事')} 
                   disabled={isGeneratingText}
                   className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors disabled:opacity-50"
                 >
                   📝 童话故事
                 </button>
                 <button 
                   onClick={() => generateSampleText('科幻小说')} 
                   disabled={isGeneratingText}
                   className="px-3 py-1.5 text-sm bg-brand-cyan/20 hover:bg-brand-cyan/40 text-brand-cyan border border-brand-cyan/30 rounded-lg transition-colors disabled:opacity-50"
                 >
                   🛸 科幻小说
                 </button>
                 <button 
                   onClick={() => generateSampleText('风景游记')} 
                   disabled={isGeneratingText}
                   className="px-3 py-1.5 text-sm bg-brand-red/20 hover:bg-brand-red/40 text-brand-red border border-brand-red/30 rounded-lg transition-colors disabled:opacity-50"
                 >
                   🏞️ 写景作文
                 </button>
               </div>
             </div>
           )}
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
           {/* Pipeline tools */}
           <div className="flex flex-row items-center gap-1 flex-none bg-black/20 p-2 rounded-xl border border-white/10">
             <button onClick={handleStep1} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border \${step >= 1 ? 'bg-brand-cyan/40 border-brand-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                {isLoadingStep === 1 ? '施法...' : '✂️ 文本分词'}
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={handleStep2} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border \${step >= 2 ? 'bg-brand-cyan/40 border-brand-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                {isLoadingStep === 2 ? '施法...' : '🧹 过滤清洗'}
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={handleStep3} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border \${step >= 3 ? 'bg-brand-cyan/40 border-brand-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                {isLoadingStep === 3 ? '算盘...' : '🧮 词频统计'}
             </button>
             <span className="text-white/20 text-xs">▶</span>
             <button onClick={handleStep4} className={`py-2 px-1 flex-1 rounded-lg text-xs md:text-sm font-bold transition-all text-white text-center border \${step >= 4 ? 'bg-brand-gold/40 border-brand-gold/50 shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}>
                ✨ 召唤词云
             </button>
           </div>
           
           <div className="bg-glass flex-1 rounded-2xl p-4 flex flex-col overflow-hidden min-h-[300px]">
               <h3 className="font-bold text-sm text-brand-cyan mb-3">状态面板</h3>
               <div className="flex-1 overflow-y-auto text-sm text-white/80 space-y-3">
                 {activeTask === 1 && (
                   <div className="flex flex-col gap-3">
                     <p className="text-brand-gold font-bold text-base">🛠️ 实操小体验：试着给这句短话分分词吧！</p>
                     <p className="text-white/70 text-xs text-brand-gold">阅读下面的短句，像刚才一样，点击两个字中间的缝隙切出词语！</p>
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
                                 <div className={`w-[2px] h-[60%] transition-colors \${manualSplitText.split(',').includes(i.toString()) ? 'bg-brand-gold shadow-[0_0_8px_#ffd700]' : 'bg-transparent group-hover:bg-brand-gold'}`} />
                               </div>
                             )}
                           </React.Fragment>
                        ))}
                     </div>
                     <div className="mt-2 text-white/80 text-sm">
                       <p className="mb-2 text-brand-cyan">已切分好的词语：</p>
                       <div className="flex flex-wrap gap-2">
                         <AnimatePresence>
                           {segments.map((seg, idx) => (
                              <motion.span 
                                key={idx + '-' + seg} 
                                layout 
                                initial={{ opacity: 0, scale: 0.8 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan px-2 py-1 rounded shadow-sm"
                              >
                                {seg}
                              </motion.span>
                           ))}
                         </AnimatePresence>
                       </div>
                     </div>
                     <button onClick={autoStep1} className="mt-2 w-full py-3 bg-brand-gold/90 hover:bg-brand-gold text-black font-bold rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.5)] transition-all transform hover:scale-[1.02]">✨ 体验完毕，让大圣帮忙自动全篇分词</button>
                   </div>
                 )}
                 
                 {activeTask === 2 && (
                   <div className="flex flex-col gap-3">
                     <p className="text-brand-gold font-bold text-base">🧹 实操小体验：清洗多余杂质</p>
                     <p className="text-white/70">点击下方你认为是毫无意义的“停用词”（比如的、地、了、啊）将它们抹去。</p>
                     <div className="flex flex-wrap gap-2 py-2">
                       {practiceWords.map((w, i) => (
                         <span key={i} onClick={() => setPracticeWords(prev => prev.filter((_, idx) => idx !== i))} className="cursor-pointer hover:bg-brand-red bg-white/10 px-3 py-1.5 rounded transition-colors text-white">{w}</span>
                       ))}
                     </div>
                     <button onClick={autoStep2} className="mt-2 w-full py-3 bg-brand-cyan/90 hover:bg-brand-cyan text-black font-bold rounded-xl shadow-[0_0_15px_rgba(26,188,156,0.4)] transition-all transform hover:scale-[1.02]">✨ 清得很累？让大圣帮忙自动清洗整篇后文！</button>
                   </div>
                 )}
                 
                 {activeTask === 3 && (
                   <div className="flex flex-col gap-3">
                     <p className="text-brand-gold font-bold text-base">🧮 实操小体验：肉眼算盘</p>
                     <p className="text-white/70 leading-relaxed">看看下面这段清洗后的词！你能找出哪一个词出现最多吗？</p>
                     <p className="bg-black/30 p-2 rounded text-white/50">{cleaned.slice(0, 40).join(' ')}...</p>
                     <div className="flex gap-2 w-full">
                        <input className="flex-1 bg-white/5 border border-white/20 p-2 rounded text-white" placeholder="哪个词出现次数最多？" />
                        <input type="number" className="w-24 bg-white/5 border border-white/20 p-2 rounded text-white" placeholder="猜次数" />
                     </div>
                     <button onClick={autoStep3} className="mt-2 w-full py-3 bg-brand-gold/90 hover:bg-brand-gold text-black font-bold rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all transform hover:scale-[1.02]">✨ 密密麻麻数不过来！让超级算盘测算全局！</button>
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
                     {wordFreq.length > 30 && <span className="opacity-50 mt-2 block w-full">...及更多</span>}
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
               width={window.innerWidth > 800 ? 800 : window.innerWidth - 60} 
               height={400}
             />
           </div>
           
           <Button onClick={onComplete} className="mt-8 px-10 py-4 text-xl">
              恭喜结业！返回首页 🏆
           </Button>
        </motion.div>
      )}
    </div>
  );
};
