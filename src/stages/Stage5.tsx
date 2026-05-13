import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';
import { drawWordCloud } from '../utils/canvas';
import { playSuccess, playError } from '../utils/audio';
import { useAI } from '../contexts/AIContext';

interface Props {
  wordFreq: Record<string, number>;
  playerName: string;
  onComplete: (score: number, cloudWords: {text: string, count: number}[]) => void;
}

const normalizeWordFreq = (value: any) => {
  const source = value?.wordFrequencies && typeof value.wordFrequencies === 'object'
    ? value.wordFrequencies
    : value;

  if (!source || typeof source !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source)
      .map(([word, count]) => [word, Number(count)] as [string, number])
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] > 0)
  ) as Record<string, number>;
};

export const Stage5: React.FC<Props> = ({ wordFreq, playerName, onComplete }) => {
  const { triggerAI } = useAI();
  const safeWordFreq = normalizeWordFreq(wordFreq);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  
  const [inputs, setInputs] = useState<Record<string, string>>({
    '法术': '',
    '金箍棒': '',
    '天宫': '',
    '妖怪': ''
  });
  const [failCount, setFailCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isRequestingAI, setIsRequestingAI] = useState(false);

  useEffect(() => {
    setTimeout(() => setStep(1), 3000);
  }, []);

  const handleGenerate = () => {
    setScore(20);
    setStep(2);
    setIsGenerating(true);
    playSuccess();
    
    setTimeout(() => {
      if (canvasRef.current) {
        const words = Object.keys(safeWordFreq).map(k => ({ text: k, count: safeWordFreq[k] }));
        // Add some more padding words to make cloud look good
        words.push({ text: '金箍棒', count: 12 });
        words.push({ text: '取经', count: 9 });
        words.push({ text: '法术', count: 5 });
        words.push({ text: '芭蕉扇', count: 4 });
        words.push({ text: '花果山', count: 8 });
        words.push({ text: '天宫', count: 7 });
        words.push({ text: '五行山', count: 6 });
        words.push({ text: '观音大士', count: 5 });
        words.push({ text: '西天大雷音寺', count: 4 });
        words.push({ text: '紧箍咒', count: 7 });
        words.push({ text: '白龙马', count: 3 });
        words.push({ text: '牛魔王', count: 5 });
        words.push({ text: '如来佛祖', count: 4 });
        words.push({ text: '筋斗云', count: 6 });
        words.push({ text: '七十二变', count: 5 });
        words.push({ text: '火眼金睛', count: 4 });
        words.push({ text: '齐天大圣', count: 8 });

        const animDuration = drawWordCloud(canvasRef.current, words);
        setTimeout(() => setIsGenerating(false), animDuration + 500);
      }
    }, 100); // Wait for canvas to mount
  };

  const requestAIFeedback = async () => {
    setIsRequestingAI(true);
    setStep(3);
    try {
      // In Vite, we use process.env.GEMINI_API_KEY from the defined block or import.meta.env
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("API key missing");
      
      const words = Object.keys(safeWordFreq).map(k => `${k}: ${safeWordFreq[k]}`).join(', ');
      const prompt = `学生【${playerName}】是四年级小学生，刚刚完成了第一张词云图。词云数据：${words}。请用孙悟空的语气，给出50字以内的鼓励评价，指出词云图反映出的主角信息，并提一个改进建议。不要使用markdown格式发声。`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.8 }
        })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "俺老孙觉得你做得太棒了！继续保持！";
      setAiFeedback(text);
    } catch (e) {
      console.error(e);
      setAiFeedback("俺老孙觉得你做得太棒了！最大的词就是主角，下次可以再多加点词！");
    } finally {
      setIsRequestingAI(false);
    }
  };

  const getFinalWords = () => {
     return Object.keys(safeWordFreq).map(k => ({ text: k, count: safeWordFreq[k] }));
  };

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto py-8 min-h-[500px]">
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text={step === 1 ? "材料都准备好了，现在把刚才统计的数据填进来，我们用数据施法，召唤词云图！" : step === 2 && !isGenerating ? "太炫了！原来《西游记》里出现最多的是俺老孙！" : ""}
          show={step > 0 && step < 3}
        />
        
        {step === 3 && (
          <MonkeyDialog 
             text={isRequestingAI ? "稍等，俺老孙正在用分身法看你的作品..." : aiFeedback}
             show={true}
          />
        )}
      </div>

      <div className="w-full max-w-4xl mt-8 flex flex-col items-center mb-48 z-10 relative">
        <div className="bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl p-4 mb-6 w-full max-w-xl">
          <p className="text-sm text-brand-cyan font-bold mb-2">【科学小知识：生成词云图】</p>
          <p className="text-xs text-white/70 leading-relaxed">
            我们把统计出的<b>“词频”</b>数据喂给计算机，计算机就会根据数值的大小来绘制图形。
            数值越大，单词占用的空间就越大。最后，一张色彩缤纷、重点突出的<b>词云图</b>就诞生啦！
          </p>
        </div>

        {/* Step 1: Display stats table */}
        {step === 1 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-glass p-8 rounded-2xl w-full max-w-xl">
             <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-8 text-center">数字施法阵（词频数据分析）</h3>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center px-4 py-2 border-b border-white/20 text-gray-400 font-bold mb-4">
                   <span>关键词</span>
                   <span>出现频率</span>
                </div>
                
                {Object.keys(safeWordFreq).map((k, idx) => (
                  <div key={k} className="flex justify-between items-center px-6 py-4 bg-white/5 hover:border-brand-gold/50 rounded-xl border border-white/10 transition-colors">
                     <span className="font-bold text-xl">{k}</span>
                     <div className="flex items-center gap-2">
                       <span className={`text-2xl font-bold ${idx === 0 ? 'text-brand-gold' : 'text-brand-cyan'}`}>
                         {safeWordFreq[k]}
                       </span>
                       <span className="text-white/60">次</span>
                     </div>
                  </div>
                ))}
             </div>
             
             <div className="mt-8 flex justify-center">
                <Button onClick={handleGenerate} className="w-full py-4 text-lg">
                  ✨ 绘制词云图！
                </Button>
             </div>
          </motion.div>
        )}

        {/* Step 2: Canvas */}
        {step >= 2 && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full flex flex-col items-center gap-6">
             <div className="relative w-full max-w-[800px] h-[340px] md:h-[500px] bg-glass rounded-[24px] border border-brand-gold/30 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-center">
                {/* Magic Circle Animation */}
                <AnimatePresence>
                   {isGenerating && (
                     <motion.div 
                        initial={{ rotate: 0, opacity: 1 }}
                        animate={{ rotate: 360 }}
                        exit={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 3, ease: 'linear' }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                     >
                       <div className="w-80 h-80 border-[6px] border-dashed border-brand-gold rounded-full opacity-50 shadow-[0_0_20px_rgba(255,215,0,0.5)]" />
                       <div className="absolute w-60 h-60 border-[4px] border-brand-cyan rounded-full animate-ping opacity-40 shadow-[0_0_20px_rgba(26,188,156,0.5)]" />
                     </motion.div>
                   )}
                </AnimatePresence>
                
                <canvas 
                  ref={canvasRef} 
                  width={window.innerWidth > 768 ? 800 : window.innerWidth - 40} 
                  height={window.innerWidth > 768 ? 500 : 340}
                  className="z-10"
                />
             </div>
             
             {!isGenerating && step === 2 && (
               <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8">
                  <Button onClick={() => onComplete(score, getFinalWords())} className="px-8 py-4 text-lg bg-gradient-to-r from-brand-cyan to-brand-gold border-none font-bold shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                    前往第七关：实战演练体验！ →
                  </Button>
               </motion.div>
             )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
