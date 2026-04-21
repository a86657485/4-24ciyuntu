import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';
import { playError, playSuccess } from '../utils/audio';
import { useAI } from '../contexts/AIContext';

const FULL_TEXT = [
  '悟空','的','金箍棒','是','法术','变','的','。',
  '妖怪','在','天宫','被','大师兄','打跑','了','。',
  '天宫','的','法术','也','打不过','行者','的','棒子','。',
  '悟空','用','金箍棒','打','怪','。'
];

interface Props {
  onComplete: (score: number, wordFreq: any) => void;
}

const WORDS = [
  { id: 1, text: '的', type: 'stop' },
  { id: 2, text: '天宫', type: 'valid' },
  { id: 3, text: '了', type: 'stop' },
  { id: 4, text: '大师兄', type: 'valid' },
  { id: 5, text: '在', type: 'stop' },
  { id: 6, text: '行者', type: 'valid' },
  { id: 7, text: '是', type: 'stop' },
  { id: 8, text: '金箍棒', type: 'valid' },
  { id: 9, text: '变', type: 'stop' },
  { id: 10, text: '怪', type: 'valid' },
  { id: 11, text: '被', type: 'stop' },
  { id: 12, text: '棒子', type: 'valid' },
  { id: 13, text: '打跑', type: 'stop' },
  { id: 14, text: '法术', type: 'valid' },
];

const SYNONYMS = [
  { id: 's1', text: '悟空', target: 'wukong' },
  { id: 's2', text: '大师兄', target: 'wukong' },
  { id: 's3', text: '行者', target: 'wukong' },
  { id: 's4', text: '妖怪', target: 'yaoguai' },
  { id: 's5', text: '怪', target: 'yaoguai' },
  { id: 's6', text: '金箍棒', target: 'bangzi' },
  { id: 's7', text: '棒子', target: 'bangzi' },
];

export const Stage4: React.FC<Props> = ({ onComplete }) => {
  const { triggerAI } = useAI();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  
  // Part A state
  const [remainingWords, setRemainingWords] = useState(WORDS);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [animTarget, setAnimTarget] = useState<'trash' | 'chest' | null>(null);

  // Part B state
  const [selectedSyn, setSelectedSyn] = useState<string | null>(null);
  const [matchedSyns, setMatchedSyns] = useState<string[]>([]);

  useEffect(() => {
    setTimeout(() => setStep(1), 3000);
  }, []);

  const handleClassify = (id: number, target: 'stop' | 'valid', uTarget: 'trash' | 'chest') => {
    const word = remainingWords.find(w => w.id === id);
    if (!word) return;

    if (word.type === target) {
      playSuccess();
      setAnimatingId(id);
      setAnimTarget(uTarget);
      setScore(s => s + 5);
      setTimeout(() => {
        setRemainingWords(prev => prev.filter(w => w.id !== id));
        setAnimatingId(null);
        setAnimTarget(null);
      }, 500);
    } else {
      playError();
      // Shake animation indicator
      setAnimatingId(id);
      setAnimTarget('error');
      setTimeout(() => {
        setAnimatingId(null);
        setAnimTarget(null);
      }, 500);
    }
  };

  useEffect(() => {
    if (step === 1 && remainingWords.length === 0) {
      setTimeout(() => setStep(2), 1500);
    }
  }, [remainingWords, step]);

  const handleSynClick = (id: string, targetId: string) => {
    if (selectedSyn === id) {
      setSelectedSyn(null);
      return;
    }
    setSelectedSyn(id);
  };

  const handleAvatarClick = (avatarId: string) => {
    if (!selectedSyn) return;
    const syn = SYNONYMS.find(s => s.id === selectedSyn);
    if (!syn) return;

    if (syn.target === avatarId) {
      playSuccess();
      setMatchedSyns(prev => [...prev, selectedSyn]);
      setScore(s => s + 8);
      setSelectedSyn(null);
    } else {
      playError();
      setSelectedSyn(null);
    }
  };

  useEffect(() => {
    if (step === 2 && matchedSyns.length === SYNONYMS.length) {
      setTimeout(() => setStep(3), 1500);
    }
  }, [matchedSyns, step]);

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto py-8 min-h-[500px]">
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text={step === 1 ? "光统计还不够，要挑出真正有用的词！把没用的丢垃圾桶，有用的放进宝箱！" : step === 2 ? "有时候同一个角色有不同的名字，我们要把它们合并起来才算得准！" : ""}
          show={step < 3}
        />
      </div>

      <div className="w-full max-w-4xl mt-8 flex flex-col items-center mb-48 z-10 relative">
        {/* Part A: Stop words cleaning */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center gap-8">
             <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-4 text-center">分类挑战</h2>
             
             <div className="flex flex-wrap justify-center gap-4 min-h-[140px] px-4">
                <AnimatePresence>
                   {remainingWords.map(w => (
                     <motion.div
                       key={w.id}
                       layout
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={
                         animatingId === w.id 
                         ? animTarget === 'trash' ? { x: -350, y: 150, scale: 0, opacity: 0 } 
                           : animTarget === 'chest' ? { x: 350, y: 150, scale: 0, opacity: 0 }
                           : { x: [-10, 10, -10, 10, 0] } // error shake
                         : { opacity: 1, scale: 1 }
                       }
                       exit={{ opacity: 0, scale: 0 }}
                       className="relative"
                     >
                       <div className="px-6 py-4 bg-glass text-xl font-bold hover:border-brand-gold cursor-default group transition-colors">
                          {w.text}
                          
                          {/* Action buttons (Mobile friendly instead of drag) */}
                          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                             <button onClick={(e) => { e.stopPropagation(); handleClassify(w.id, 'stop', 'trash'); }} className="bg-brand-red text-white text-xs px-3 py-2 rounded-xl shadow-md border border-white/20">🗑️ 停用</button>
                             <button onClick={(e) => { e.stopPropagation(); handleClassify(w.id, 'valid', 'chest'); }} className="bg-brand-gold text-black text-xs px-3 py-2 rounded-xl shadow-md font-bold">⭐ 有效</button>
                          </div>
                       </div>
                     </motion.div>
                   ))}
                </AnimatePresence>
             </div>
             
             <div className="flex justify-around w-full max-w-4xl mt-12 gap-6 px-4">
                <div className="flex flex-col items-center bg-black/60 p-8 rounded-3xl w-48 border-[2px] border-brand-red shadow-[0_0_20px_rgba(192,57,43,0.3)]">
                   <div className="text-5xl mb-4 drop-shadow-[0_4px_10px_rgba(192,57,43,0.8)]">🗑️</div>
                   <div className="text-brand-red font-bold text-xl">停用词</div>
                   <div className="text-sm text-gray-400 mt-2">的、是、变、在...</div>
                </div>
                
                {/* Spacer variable space */}
                <div className="flex-1 opacity-0"></div>

                <div className="flex flex-col items-center bg-black/60 p-8 rounded-3xl w-48 border-[2px] border-brand-gold shadow-[0_0_20px_rgba(255,215,0,0.3)] relative">
                   <div className="text-5xl mb-4 drop-shadow-[0_4px_10px_rgba(255,215,0,0.8)]">📦</div>
                   <div className="text-brand-gold font-bold text-xl">有效词</div>
                   <div className="text-sm text-gray-400 mt-2">天宫、大师兄...</div>
                   {remainingWords.length === 0 && (
                     <motion.div initial={{ y: 0, opacity: 1, scale: 0.5 }} animate={{ y: -60, opacity: 0, scale: 1.5 }} transition={{ duration: 1 }} className="absolute text-brand-gold text-3xl font-bold whitespace-nowrap">
                       +20 金币!
                     </motion.div>
                   )}
                </div>
             </div>
          </motion.div>
        )}

        {/* Part B: Synonyms */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mt-8 flex flex-col items-center gap-12 bg-glass p-10 rounded-2xl">
             <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-4">先点击词语，再点击对应的人物头像连线</h3>
             
             {/* Words array */}
             <div className="flex flex-wrap justify-center gap-4">
               {SYNONYMS.map(s => {
                 const isMatched = matchedSyns.includes(s.id);
                 return (
                   <button
                     key={s.id}
                     disabled={isMatched}
                     onClick={() => handleSynClick(s.id, s.target)}
                     className={`px-5 py-3 rounded-2xl border-[2px] font-bold transition-all \${
                       isMatched ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan opacity-40 shadow-none' 
                       : selectedSyn === s.id ? 'bg-brand-gold text-bg-deep border-brand-gold shadow-[0_4px_15px_rgba(255,215,0,0.5)] rotate-2' 
                       : 'bg-white/5 border-white/20 hover:border-brand-gold hover:bg-brand-gold/10 text-white'
                     }`}
                   >
                     {s.text} {isMatched && '✓'}
                   </button>
                 )
               })}
             </div>

             {/* Targets array */}
             <div className="flex justify-center flex-wrap gap-8 md:gap-16 mt-8">
                <motion.div 
                   animate={matchedSyns.includes('s1') && matchedSyns.includes('s2') && matchedSyns.includes('s3') ? { scale: [1, 1.2, 1], boxShadow: "0 0 30px #FFD700" } : {}}
                   onClick={() => handleAvatarClick('wukong')} 
                   className={`w-32 h-32 rounded-full bg-brand-gold/10 flex flex-col items-center justify-center border-[3px] \${selectedSyn ? 'border-brand-gold cursor-pointer animate-pulse shadow-[0_0_20px_rgba(255,215,0,0.6)]' : 'border-white/20'} transition-all`}
                >
                   <span className="text-5xl drop-shadow-lg">🐒</span>
                   <span className="text-sm font-bold mt-2 text-brand-gold">悟空</span>
                </motion.div>
                
                <motion.div 
                   animate={matchedSyns.includes('s4') && matchedSyns.includes('s5') ? { scale: [1, 1.2, 1], boxShadow: "0 0 30px #C0392B" } : {}}
                   onClick={() => handleAvatarClick('yaoguai')} 
                   className={`w-32 h-32 rounded-full bg-brand-red/10 flex flex-col items-center justify-center border-[3px] \${selectedSyn ? 'border-brand-red cursor-pointer animate-pulse shadow-[0_0_20px_rgba(192,57,43,0.6)]' : 'border-white/20'} transition-all`}
                >
                   <span className="text-5xl drop-shadow-lg">👹</span>
                   <span className="text-sm font-bold mt-2 text-brand-red">妖怪</span>
                </motion.div>

                <motion.div 
                   animate={matchedSyns.includes('s6') && matchedSyns.includes('s7') ? { scale: [1, 1.2, 1], boxShadow: "0 0 30px #1ABC9C" } : {}}
                   onClick={() => handleAvatarClick('bangzi')} 
                   className={`w-32 h-32 rounded-full bg-brand-cyan/10 flex flex-col items-center justify-center border-[3px] \${selectedSyn ? 'border-brand-cyan cursor-pointer animate-pulse shadow-[0_0_20px_rgba(26,188,156,0.6)]' : 'border-white/20'} transition-all`}
                >
                   <span className="text-5xl drop-shadow-lg">🗡️</span>
                   <span className="text-sm font-bold mt-2 text-brand-cyan">武器</span>
                </motion.div>
             </div>
          </motion.div>
        )}

        {/* Summary */}
        {step === 3 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-8 bg-glass border-2 border-brand-gold p-10 rounded-2xl max-w-xl text-center w-full">
             <div className="text-5xl mb-4">✨</div>
             <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-6">有效词三原则</h3>
             <ul className="text-lg mb-8 text-white/80 space-y-3 font-medium">
               <li>✓ 去除无用的停用词</li>
               <li>✓ 合并指代相同角色的近义词</li>
               <li>✓ 保留重要的名词和动词</li>
             </ul>
             <Button onClick={() => onComplete(score, { '悟空': 15, '法术': 8, '金箍棒': 10, '天宫': 6, '妖怪': 4 })} className="w-full">继续冒险 →</Button>
          </motion.div>
        )}

      </div>
    </div>
  );
};

