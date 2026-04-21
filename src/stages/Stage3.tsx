import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';
import { playSuccess } from '../utils/audio';
import { useAI } from '../contexts/AIContext';

interface Props {
  onComplete: (score: number) => void;
}

const TEXT_CHUNK = [
  '悟空','的','金箍棒','是','法术','变','的','。',
  '妖怪','在','天宫','被','悟空','打跑','了','。',
  '天宫','的','法术','也','打不过','悟空','的','金箍棒','。',
  '悟空','用','金箍棒','打','妖怪','。'
];

const TARGETS = [
  { word: '悟空', targetCount: 4 },
  { word: '妖怪', targetCount: 2 },
  { word: '金箍棒', targetCount: 3 },
  { word: '天宫', targetCount: 2 },
  { word: '法术', targetCount: 2 }
];

const getWordStyle = (word: string, isActive: boolean) => {
  if (!isActive) return {};
  switch(word) {
    case '悟空': return { backgroundColor: '#FFD700', color: '#000', borderColor: '#FFD700', boxShadow: '0 0 15px rgba(255,215,0,0.5)' };
    case '妖怪': return { backgroundColor: '#C0392B', color: '#FFF', borderColor: '#C0392B', boxShadow: '0 0 15px rgba(192,57,43,0.5)' };
    case '金箍棒': return { backgroundColor: '#1ABC9C', color: '#000', borderColor: '#1ABC9C', boxShadow: '0 0 15px rgba(26,188,156,0.5)' };
    case '天宫': return { backgroundColor: '#3B82F6', color: '#FFF', borderColor: '#3B82F6', boxShadow: '0 0 15px rgba(59,130,246,0.5)' };
    case '法术': return { backgroundColor: '#A855F7', color: '#FFF', borderColor: '#A855F7', boxShadow: '0 0 15px rgba(168,85,247,0.5)' };
    default: return {};
  }
};

const getBarStyle = (word: string) => {
  switch(word) {
    case '悟空': return { backgroundColor: '#FFD700' };
    case '妖怪': return { backgroundColor: '#C0392B' };
    case '金箍棒': return { backgroundColor: '#1ABC9C' };
    case '天宫': return { backgroundColor: '#3B82F6' };
    case '法术': return { backgroundColor: '#A855F7' };
    default: return { backgroundColor: '#FFFFFF' };
  }
};

const getTextStyle = (word: string) => {
  switch(word) {
    case '悟空': return { color: '#FFD700' };
    case '妖怪': return { color: '#C0392B' };
    case '金箍棒': return { color: '#1ABC9C' };
    case '天宫': return { color: '#3B82F6' };
    case '法术': return { color: '#A855F7' };
    default: return { color: '#FFFFFF' };
  }
};

export const Stage3: React.FC<Props> = ({ onComplete }) => {
  const { triggerAI } = useAI();
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [clickedIndices, setClickedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setTimeout(() => setStep(1), 3000);
  }, []);

  const allCompleted = TARGETS.every(t => (counts[t.word] || 0) >= t.targetCount);

  useEffect(() => {
    if (allCompleted && step === 1) {
      setScore(30);
      setTimeout(() => setStep(2), 1000);
    }
  }, [allCompleted, step]);

  const handleWordClick = (word: string, index: number) => {
    if (clickedIndices.includes(index)) return;
    if (!TARGETS.find(t => t.word === word)) {
      return;
    }
    
    const current = counts[word] || 0;
    const target = TARGETS.find(t => t.word === word)!.targetCount;
    if (current >= target) return;

    playSuccess();
    setClickedIndices(prev => [...prev, index]);
    setCounts(prev => ({ ...prev, [word]: current + 1 }));
  };

  const [compareSlide, setCompareSlide] = useState(0);

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto py-8 min-h-[500px]">
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text={step < 2 ? "词语切好了，现在要数每个词出现了多少次！帮俺数数这几样东西出现了几次！" : "看到区别了吗？如果把'的'、'了'这种停用词也算进去，就像取经路上的拦路石，重点都不突出了！"}
          show={true}
        />
      </div>

      <div className="w-full max-w-5xl mt-8 flex flex-col mb-48 z-10 relative">
        {step === 1 && (
          <div className="w-full flex flex-col lg:flex-row gap-8">
             {/* Left area: Text cloud */}
             <div className="flex-[2] bg-glass p-8 rounded-2xl relative">
                <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-6">点击找出目标词语</h3>
                <div className="flex flex-wrap gap-4 py-4 content-start">
                   {TEXT_CHUNK.map((word, idx) => {
                     const isTarget = TARGETS.find(t => t.word === word);
                     const isClicked = clickedIndices.includes(idx);
                     const isCompleted = isTarget && (counts[word] || 0) >= isTarget.targetCount;
                     
                     const isActive = isTarget && (isClicked || isCompleted);
                     const customStyle = getWordStyle(word, isActive || false);
                     
                     return (
                       <motion.div 
                         key={idx}
                         whileHover={!isClicked && isTarget && !isCompleted ? { scale: 1.1 } : {}}
                         whileTap={!isClicked && isTarget && !isCompleted ? { scale: 0.9 } : {}}
                         onClick={() => handleWordClick(word, idx)}
                         style={customStyle}
                         className={`px-4 py-2 rounded-xl border cursor-pointer transition-all shadow-sm \${
                            isActive 
                              ? 'font-bold' 
                              : 'bg-transparent border-white text-white font-medium hover:bg-white/20'
                         }`}
                       >
                         {word}
                       </motion.div>
                     );
                   })}
                </div>
             </div>

             {/* Right area: Table */}
             <div className="flex-1 bg-glass p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-center mb-6 border-b border-white/10 pb-4">统计进度表</h3>
                <div className="space-y-6">
                   {TARGETS.map(t => {
                     const current = counts[t.word] || 0;
                     const progress = (current / t.targetCount) * 100;
                     const isDone = current >= t.targetCount;
                     const tStyle = getTextStyle(t.word);
                     const bStyle = getBarStyle(t.word);
                     
                     return (
                       <div key={t.word} className="space-y-2">
                          <div className="flex justify-between text-sm">
                             <span 
                               className={`font-bold transition-colors \${!isDone && 'text-white/80'}`}
                               style={isDone ? tStyle : {}}
                             >
                                {t.word} {isDone && '✨'}
                             </span>
                             <span 
                               className={isDone ? 'font-bold' : 'text-white/60'}
                               style={isDone ? tStyle : {}}
                             >
                                {current} / {t.targetCount}
                             </span>
                          </div>
                          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10 p-[2px]">
                             <motion.div 
                               className={`h-full rounded-full transition-colors \${isDone ? 'brightness-110' : 'opacity-80'}`}
                               style={bStyle}
                               initial={{ width: 0 }}
                               animate={{ width: `\${progress}%` }}
                               transition={{ type: 'spring', stiffness: 50, damping: 10 }}
                             />
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
        )}

        {step >= 2 && (
          <div className="w-full flex flex-col items-center">
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-glass p-8 rounded-2xl w-full max-w-3xl">
                <div className="flex justify-between items-center mb-8 gap-4 px-4">
                   <button 
                     className={`flex-1 py-3 font-bold rounded-[16px] transition-all \${compareSlide === 0 ? 'bg-brand-red text-white shadow-[0_10px_20px_rgba(192,57,43,0.3)] border border-brand-red border-b-4' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                     onClick={() => setCompareSlide(0)}
                   >
                     未去停用词
                   </button>
                   <button 
                     className={`flex-1 py-3 font-bold rounded-[16px] transition-all \${compareSlide === 1 ? 'bg-brand-cyan text-white shadow-[0_10px_20px_rgba(26,188,156,0.3)] border border-brand-cyan border-b-4' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                     onClick={() => setCompareSlide(1)}
                   >
                     去掉停用词后
                   </button>
                </div>

                <div className="h-80 relative bg-black/60 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center p-8 shadow-[inset_0_5px_30px_rgba(0,0,0,0.8)]">
                   <AnimatePresence mode="wait">
                      {compareSlide === 0 ? (
                         <motion.div key="0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center relative w-full h-full">
                            <span className="absolute top-[20%] left-[30%] text-5xl text-white/50 font-bold drop-shadow-md">的</span>
                            <span className="absolute bottom-[30%] left-[20%] text-4xl text-white/40 font-bold drop-shadow-md">了</span>
                            <span className="absolute top-[40%] left-[45%] text-3xl text-brand-gold/60 font-bold drop-shadow-md">悟空</span>
                            <span className="absolute top-[10%] right-[30%] text-4xl text-white/50 font-bold drop-shadow-md">是</span>
                            <span className="absolute bottom-[20%] right-[40%] text-2xl text-brand-red/60 font-bold drop-shadow-md">妖怪</span>
                            <span className="absolute bottom-[40%] right-[20%] text-5xl text-white/40 font-bold drop-shadow-md">在</span>
                         </motion.div>
                      ) : (
                         <motion.div key="1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center relative w-full h-full flex flex-col items-center justify-center gap-6">
                            <span className="text-7xl font-bold text-brand-gold block drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">悟空</span>
                            <div className="flex items-center justify-center gap-10">
                              <span className="text-5xl text-brand-cyan font-bold drop-shadow-md">金箍棒</span>
                              <span className="text-4xl text-brand-red font-bold drop-shadow-md">妖怪</span>
                            </div>
                            <div className="flex items-center justify-center gap-12 mt-2">
                              <span className="text-3xl text-brand-white font-bold drop-shadow-md">天宫</span>
                              <span className="text-3xl text-brand-white font-bold drop-shadow-md">法术</span>
                            </div>
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>

                <div className="mt-8 text-center flex justify-center">
                   <Button onClick={() => onComplete(score)} className="w-[300px]">下一关 →</Button>
                </div>
             </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

