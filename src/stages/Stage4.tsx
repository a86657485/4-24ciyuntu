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
  mode?: 'all' | 'clean' | 'merge';
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

export const Stage4: React.FC<Props> = ({ onComplete, mode = 'all' }) => {
  const { triggerAI } = useAI();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [failCountA, setFailCountA] = useState(0);
  const [failCountB, setFailCountB] = useState(0);
  
  // Part A state
  const [remainingWords, setRemainingWords] = useState(WORDS);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [animTarget, setAnimTarget] = useState<'trash' | 'chest' | 'error' | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [classificationLocked, setClassificationLocked] = useState(false);

  // Part B state
  const [selectedSyn, setSelectedSyn] = useState<string | null>(null);
  const [matchedSyns, setMatchedSyns] = useState<string[]>([]);
  const cleanOnly = mode === 'clean';
  const mergeOnly = mode === 'merge';

  const summaryTitle = cleanOnly ? '去废词完成' : mergeOnly ? '合并同义词完成' : '有效词三原则';
  const scienceTitle = cleanOnly ? '【科学小知识：去废词】' : mergeOnly ? '【科学小知识：合并同义词】' : '【科学小知识：词频统计与清洗】';
  const scienceText = cleanOnly
    ? <>在生成词云图前，要先把<b>停用词</b>（没有实际意义、容易干扰判断的词）清理掉，保留真正能表达内容的关键词。</>
    : mergeOnly
      ? <>同一个角色或事物可能有多个叫法。把<b>同义词</b>和<b>近义词</b>合并到一起，词频统计才会更准确。</>
      : <>把所有的词数一数，这就是<b>“词频统计”</b>。但为了让词云图更准确，我们还得把<b>停用词</b>（没意义的词）扔掉，并且把<b>近义词</b>（意思相同的词）合并到一起。这样，最重要的信息才会变得最显眼！</>;

  useEffect(() => {
    setTimeout(() => setStep(mergeOnly ? 2 : 1), 3000);
  }, [mergeOnly]);

  const handleClassify = (id: number, target: 'stop' | 'valid', uTarget: 'trash' | 'chest') => {
    if (classificationLocked || animatingId !== null) return;
    const word = remainingWords.find(w => w.id === id);
    if (!word) return;
    setClassificationLocked(true);
    setSelectedWordId(null);

    if (word.type === target) {
      playSuccess();
      setAnimatingId(id);
      setAnimTarget(uTarget);
      setScore(s => s + 5);
      setTimeout(() => {
        setRemainingWords(prev => prev.filter(w => w.id !== id));
        setAnimatingId(null);
        setAnimTarget(null);
        setClassificationLocked(false);
      }, 500);
    } else {
      playError();
      setAnimatingId(id);
      setAnimTarget('error');
      setFailCountA(prev => {
        const nextFails = prev + 1;
        if (nextFails >= 3) {
          triggerAI('别急，先别连续点。停用词通常是“的、了、在、是”这类作用小的词；有效词通常是人物、地点、物品或动作。选中一个词后，慢慢判断它该去哪里。');
        } else {
          triggerAI('分类错啦！再想想，“' + word.text + '”在句子中是必不可少的关键词，还是没有实义的虚词？');
        }
        return nextFails;
      });
      setTimeout(() => {
        setAnimatingId(null);
        setAnimTarget(null);
        setClassificationLocked(false);
      }, 500);
    }
  };

  useEffect(() => {
    if (step === 1 && remainingWords.length === 0) {
      setSelectedWordId(null);
      setTimeout(() => setStep(cleanOnly ? 3 : 2), 1500);
    }
  }, [remainingWords, step, cleanOnly]);

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
      const nextFails = failCountB + 1;
      setFailCountB(nextFails);
      if (nextFails >= 3) {
        triggerAI('近义词合并有点复杂，悟空施展“归一法”，都帮你连好了！');
        setMatchedSyns(SYNONYMS.map(s => s.id));
      } else {
        triggerAI('连线错啦！“' + syn.text + '”指的可能不是这位，再想想！');
      }
      setSelectedSyn(null);
    }
  };

  useEffect(() => {
    if (step === 2 && matchedSyns.length === SYNONYMS.length) {
      setTimeout(() => setStep(3), 1500);
    }
  }, [matchedSyns, step]);

  const completeStage = () => {
    const mergedWordFreq = {
      '悟空': 15,
      '法术': 8,
      '金箍棒': 10,
      '天宫': 6,
      '妖怪': 4,
    };

    onComplete(score, {
      ...(mergeOnly || mode === 'all' ? mergedWordFreq : {}),
      mode,
      failCountClassify: failCountA,
      failCountSynonyms: failCountB,
    });
  };

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto py-8 min-h-[500px]">
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text={step === 1 ? "现在进入去废词，把没用的停用词丢掉，把真正有意义的词留下来！" : step === 2 ? "同一个角色可能有不同名字，合并同义词后，词频才会算得更准！" : ""}
          show={step < 3}
        />
      </div>

      <div className="w-full max-w-4xl mt-8 flex flex-col items-center mb-48 z-10 relative">
        <div className="bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl p-4 mb-6 w-full">
          <p className="text-sm text-brand-cyan font-bold mb-2">{scienceTitle}</p>
          <p className="text-xs text-white/70 leading-relaxed">
            {scienceText}
          </p>
        </div>

        {/* Part A: Stop words cleaning */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center gap-8">
             <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-4 text-center">去废词挑战</h2>
             
             <div className="flex flex-wrap justify-center gap-x-4 gap-y-16 min-h-[180px] px-4 pb-12">
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
                       <div
                         onClick={() => {
                           if (classificationLocked || animatingId !== null) return;
                           setSelectedWordId(prev => prev === w.id ? null : w.id);
                         }}
                         className={`px-6 py-4 bg-glass text-xl font-bold border transition-colors cursor-pointer select-none ${
                           selectedWordId === w.id
                             ? 'border-brand-gold shadow-[0_0_18px_rgba(255,215,0,0.35)] bg-brand-gold/10'
                             : 'border-white/10 hover:border-brand-gold/60 hover:bg-white/10'
                         }`}
                       >
                          {w.text}
                       </div>
                       <AnimatePresence>
                         {selectedWordId === w.id && (
                           <motion.div
                             initial={{ opacity: 0, y: -4, scale: 0.96 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, y: -4, scale: 0.96 }}
                             className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2 whitespace-nowrap z-30"
                           >
                             <button
                               disabled={classificationLocked}
                               onClick={(e) => { e.stopPropagation(); handleClassify(w.id, 'stop', 'trash'); }}
                               className="bg-brand-red text-white text-xs px-4 py-2 rounded-xl shadow-md border border-white/20 disabled:opacity-50 disabled:cursor-wait"
                             >
                               🗑️ 停用
                             </button>
                             <button
                               disabled={classificationLocked}
                               onClick={(e) => { e.stopPropagation(); handleClassify(w.id, 'valid', 'chest'); }}
                               className="bg-brand-gold text-black text-xs px-4 py-2 rounded-xl shadow-md font-bold disabled:opacity-50 disabled:cursor-wait"
                             >
                               ⭐ 有效
                             </button>
                           </motion.div>
                         )}
                       </AnimatePresence>
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
             <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-4">合并同义词：先点词语，再点对应的人物头像</h3>
             
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
             <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-6">{summaryTitle}</h3>
             <ul className="text-lg mb-8 text-white/80 space-y-3 font-medium">
               {cleanOnly ? (
                 <>
                   <li>✓ 去除无用的停用词</li>
                   <li>✓ 保留重要的名词和动词</li>
                   <li>✓ 为后续词频统计减少干扰</li>
                 </>
               ) : (
                 <>
                   <li>✓ 合并指代相同角色的近义词</li>
                   <li>✓ 让同一事物的词频集中计算</li>
                   <li>✓ 生成更准确、更清晰的词云图</li>
                 </>
               )}
             </ul>
             <Button onClick={completeStage} className="w-full">继续冒险 →</Button>
          </motion.div>
        )}

      </div>
    </div>
  );
};

