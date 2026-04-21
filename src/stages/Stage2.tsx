import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';
import { playCut, playError, playSuccess } from '../utils/audio';
import { useAI } from '../contexts/AIContext';

interface Props {
  onComplete: (score: number) => void;
}

interface SliceGameProps {
  sentence: string;
  correctSlices: number[];
  onFinish: (score: number) => void;
}

const SliceGame: React.FC<SliceGameProps> = ({ sentence, correctSlices, onFinish }) => {
  const { triggerAI } = useAI();
  const [slices, setSlices] = useState<number[]>([]);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [successIndex, setSuccessIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const chars = sentence.split('');

  // Check win condition
  useEffect(() => {
    const isWin = correctSlices.every(s => slices.includes(s));
    if (isWin) {
      playSuccess();
      setTimeout(() => onFinish(score), 1000);
    }
  }, [slices, correctSlices, score, onFinish]);

  const handleSlice = (index: number) => {
    if (slices.includes(index)) return;

    if (correctSlices.includes(index)) {
      playCut();
      setSlices(prev => [...prev, index]);
      setScore(s => s + 8);
      // Show success animation at this specific index
      setSuccessIndex(index);
      setTimeout(() => setSuccessIndex(null), 800);
    } else {
      playError();
      setErrorIndex(index);
      triggerAI('在分词体验关卡中，学生切错了字词的边界（比如把完整的词切碎了，或者切的位置不对）。请以孙悟空的口吻纠正他，词语要表达完整的意思，不要胡乱切碎！');
      setTimeout(() => setErrorIndex(null), 500);
    }
  };

  return (
    <div className="bg-glass p-8 rounded-2xl w-full flex-1 flex flex-col items-center">
       <div className="flex flex-wrap justify-center items-center gap-y-6 py-10 relative my-auto max-w-3xl">
          {chars.map((char, i) => {
             // Each chunk is colored differently if it's properly split
             const chunkIndex = slices.filter(s => s <= i).length;
             const isCompleteWord = chunksAreComplete(chunkIndex, slices, correctSlices);
             
             return (
               <React.Fragment key={i}>
                  <motion.div 
                     animate={errorIndex === i ? { x: [-5, 5, -5, 5, 0] } : {}}
                     className={`text-3xl sm:text-4xl font-bold p-3 rounded-xl transition-all shadow-sm cursor-default \${
                       chunkIndex % 2 === 0 
                         ? 'bg-white/10 text-white border border-white/20' 
                         : 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                     } \${successIndex === i || successIndex === i - 1 ? 'scale-110 shadow-[0_0_15px_rgba(255,215,0,0.5)]' : ''}`}
                  >
                    {char}
                  </motion.div>

                  {i < chars.length - 1 && (
                    <div 
                      onClick={() => handleSlice(i)}
                      className="w-6 h-16 sm:w-10 sm:h-20 flex items-center justify-center cursor-crosshair group relative z-10 mx-[-2px] transition-transform hover:scale-110"
                    >
                       {/* The visible slice mark */}
                       <div className={`w-[3px] h-[70%] transition-all rounded-full \${slices.includes(i) ? 'bg-brand-gold shadow-[0_0_15px_#FFD700]' : 'bg-white/20 group-hover:bg-brand-gold/60 group-hover:w-2 group-hover:h-[90%]'}`} />
                       
                       {/* Cutting animation */}
                       <AnimatePresence>
                         {slices.includes(i) && (
                            <motion.div 
                              initial={{ height: 0, opacity: 1, scaleY: 0 }} 
                              animate={{ height: '180%', opacity: 0, scaleY: 1 }} 
                              transition={{ duration: 0.4, ease: "easeOut" }} 
                              className="absolute w-2 bg-white shadow-[0_0_30px_white] rounded-full origin-top" 
                            />
                         )}
                       </AnimatePresence>
                       
                       {/* Error explicitly placed here */}
                       <AnimatePresence>
                         {errorIndex === i && (
                            <motion.div 
                               initial={{ scale: 0, opacity: 0 }} 
                               animate={{ scale: 1, opacity: 1 }} 
                               exit={{ scale: 1.5, opacity: 0 }}
                               className="absolute -top-10 text-brand-red font-bold text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] bg-black/50 w-10 h-10 rounded-full flex items-center justify-center border border-brand-red/50"
                            >
                               ×
                            </motion.div>
                         )}
                       </AnimatePresence>

                       {/* Success score explicitly placed here */}
                       <AnimatePresence>
                         {successIndex === i && (
                            <motion.div 
                               initial={{ scale: 0, y: 0, opacity: 1 }} 
                               animate={{ scale: 1.2, y: -40, opacity: 0 }} 
                               transition={{ duration: 0.8 }}
                               className="absolute pointer-events-none text-brand-gold font-bold text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-20"
                            >
                               +8
                            </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  )}
               </React.Fragment>
             );
          })}
       </div>
    </div>
  );
};

// helper
function chunksAreComplete(chunkIndex: number, slices: number[], correctSlices: number[]) {
  // optionally logic to highlight correctly cut words
  return true;
}

export const Stage2: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setTimeout(() => setStep(1), 3000);
  }, []);

  const handleLevel1 = (s: number) => {
    setScore(score + s);
    setStep(2);
  };

  const handleLevel2 = (s: number) => {
    setScore(score + s);
    setStep(3);
  };

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto py-8 min-h-[500px]">
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text="要做词云图，第一步就是把句子剁成一个个词语！试试看用你的火眼金睛找出词语的分界线！"
          show={true}
        />
      </div>

      <div className="w-full max-w-5xl mt-8 flex flex-col items-center mb-48 z-10 relative">
        {step === 1 && (
           <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full flex">
              <div className="flex-1">
                <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-6 text-center">⚔️ 第一关：小试牛刀</h3>
                <SliceGame 
                  sentence="唐僧骑马咚咚咚后面跟着孙悟空"
                  correctSlices={[1, 3, 6, 8, 10]}
                  onFinish={handleLevel1}
                />
              </div>
           </motion.div>
        )}

        {step === 2 && (
           <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full flex">
              <div className="flex-1">
                <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-red to-[#FF8C00] text-transparent bg-clip-text mb-6 text-center">🔥 第二关：进阶挑战</h3>
                <SliceGame 
                  sentence="悟空拔出一根毫毛吹口仙气变出千百个小猴"
                  correctSlices={[1, 3, 5, 7, 8, 9, 11, 13, 16]}
                  onFinish={handleLevel2}
                />
              </div>
           </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-8 bg-glass border-2 border-brand-cyan p-8 rounded-3xl flex-1 flex flex-col justify-center items-center text-center max-w-2xl w-full shadow-[0_10px_40px_rgba(26,188,156,0.3)] mx-auto">
             <div className="text-6xl mb-6 bg-brand-cyan/20 w-24 h-24 rounded-full flex items-center justify-center border border-brand-cyan/50">💡</div>
             <h3 className="text-3xl font-bold text-brand-cyan mb-6">分词小知识</h3>
             <p className="text-xl mb-12 text-white/90 leading-loose">
               计算机就像个刚学说话的小孩，它不认识长句子。<br />
               把连续的文字拆成有意义的词语，这个过程叫<strong className="text-brand-gold text-2xl mx-2">“分词”</strong>。<br />
               这也是我们制作词云图非常重要的一步！
             </p>
             <Button onClick={() => onComplete(score)} className="w-[300px] text-lg py-4">继续冒险 →</Button>
          </motion.div>
        )}
      </div>

    </div>
  );
};


