import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';
import { playError, playSuccess } from '../utils/audio';

interface Props {
  onComplete: (score: number) => void;
}

const CLOUD_WORDS = [
  { text: '孙悟空', size: 80, color: 'var(--color-brand-gold)', x: -60, y: -20 },
  { text: '唐僧', size: 50, color: 'var(--color-brand-cyan)', x: -150, y: 30 },
  { text: '取经', size: 42, color: 'var(--color-brand-red)', x: -180, y: -60 },
  { text: '猪八戒', size: 40, color: '#8E44AD', x: 60, y: -80 },
  { text: '金箍棒', size: 34, color: '#3498DB', x: 120, y: 40 },
  { text: '法术', size: 30, color: '#E67E22', x: 80, y: -10 },
  { text: '妖怪', size: 24, color: 'var(--color-brand-cyan)', x: 0, y: 70 },
  { text: '沙和尚', size: 20, color: 'var(--color-brand-white)', x: -100, y: -10 },
  { text: '东土大唐', size: 18, color: '#95A5A6', x: -40, y: 100 },
];

export const Stage1: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [q1Answered, setQ1Answered] = useState(false);
  const [q2Answered, setQ2Answered] = useState(false);
  const [q2Selection, setQ2Selection] = useState<number[]>([]);
  
  // Drag and drop state
  const [dragMatches, setDragMatches] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [score, setScore] = useState(0);

  useEffect(() => {
    setTimeout(() => setStep(1), 3000);
  }, []);

  const handleQ1 = (isCorrect: boolean) => {
    if (isCorrect) {
      setQ1Answered(true);
      setScore(s => s + 15);
      setErrorMsg('');
      setStep(2);
    } else {
      playError();
      setErrorMsg('再想想，最重要的词是不是通常比较大？');
    }
  };

  const handleQ2 = () => {
    // Correct answers: index 0 and 2
    if (q2Selection.includes(0) && q2Selection.includes(2) && q2Selection.length === 2) {
      setQ2Answered(true);
      setScore(s => s + 15);
      setErrorMsg('');
      setStep(3);
      playSuccess();
    } else {
      playError();
      setErrorMsg('提示：词云主要展示词语的频率和重要性哦！');
    }
  };

  const toggleQ2Selection = (idx: number) => {
    setQ2Selection(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const checkDragMatch = (targetId: string, itemId: string) => {
    const validMatches: Record<string, string> = {
      't1': 'i1', // 词云图 -> 文本数据可视化
      't2': 'i2', // 柱状图 -> 数值比较
      't3': 'i3', // 饼图 -> 占比分析
    };

    if (validMatches[targetId] === itemId) {
      playSuccess();
      setDragMatches(prev => {
        const next = { ...prev, [targetId]: itemId };
        setScore(s => s + 5);
        if (Object.keys(next).length === 3) {
          setTimeout(() => setStep(4), 1000);
        }
        return next;
      });
    } else {
      playError();
    }
  };

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto py-8 lg:flex-row lg:items-stretch gap-10 min-h-[500px]">
      
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text="嘿！这词云图里藏着大秘密。俺老孙发现，谁在书里出现的次数越多，他的名字就变得越大！快来帮俺破解这“文本施法”的奥秘吧！"
          show={true}
        />
      </div>
      
      {/* Game Card Left: Explore */}
      <div className="flex-1 bg-glass p-8 rounded-2xl flex flex-col relative z-10 w-full mb-48 lg:mb-0">
        <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-2">🌟 探索天庭词云图</h2>
        <p className="text-white/60 mb-6">悟空在图书馆发现了一张神秘的图，仔细观察图中最大的那个词...</p>
        
        {/* Mock Word Cloud Display */}
        <div className="flex-1 relative w-full min-h-[250px] flex items-center justify-center overflow-hidden">
          {CLOUD_WORDS.map((w, i) => (
            <motion.div
              key={i}
              className="absolute font-bold drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] opacity-90 cursor-default"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: w.x,
                y: w.y,
              }}
              whileHover={{
                scale: 1.1,
                filter: "brightness(1.2)"
              }}
              transition={{ 
                scale: { delay: i * 0.1, type: 'spring', bounce: 0.5 }
              }}
              style={{ fontSize: w.size, color: w.color }}
            >
              {w.text}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="lg:max-w-[420px] w-full flex flex-col gap-6 relative z-10 lg:mb-0 mb-48">
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-brand-red font-bold p-4 bg-brand-red/10 border-brand-red/50 border rounded-xl"
            >
              提示：{errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q1 */}
        {step >= 1 && !q1Answered && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-glass p-8 rounded-2xl flex-1 flex flex-col">
             <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">探究任务 01</h3>
             <p className="text-sm text-white/80 leading-relaxed mb-6">图中哪个词最大？为什么它显示得比别的词都要大呢？</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
               {[
                 { t: '字最好看', c: false },
                 { t: '出现次数最多', c: true },
                 { t: '悟空最厉害', c: false },
                 { t: '随机决定的', c: false }
               ].map((opt, i) => (
                 <button key={i} onClick={() => handleQ1(opt.c)} className="bg-white/5 border border-white/10 rounded-xl p-4 text-left transition-all hover:bg-brand-gold/10 hover:border-brand-gold flex items-center">
                   <span className="text-brand-gold font-bold mr-3">{String.fromCharCode(65 + i)}</span>{opt.t}
                 </button>
               ))}
             </div>
          </motion.div>
        )}

        {/* Q2 */}
        {step >= 2 && !q2Answered && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-glass p-8 rounded-2xl flex-1 flex flex-col">
             <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">探究任务 02</h3>
             <p className="text-sm text-white/80 leading-relaxed mb-4">词云图能告诉我们什么信息？(多选)</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-auto">
               {['词语出现的频率', '词语的意思', '重要程度', '作者是谁'].map((opt, i) => (
                 <label key={i} className={`flex items-center space-x-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer transition-all hover:bg-brand-gold/10 \${q2Selection.includes(i) ? 'border-brand-gold bg-brand-gold/10' : ''}`}>
                   <input type="checkbox" checked={q2Selection.includes(i)} onChange={() => toggleQ2Selection(i)} className="w-5 h-5 accent-brand-gold hidden" />
                   <span className="text-brand-gold font-bold">{q2Selection.includes(i) ? '✓' : '—'}</span>
                   <span>{opt}</span>
                 </label>
               ))}
             </div>
             <Button onClick={handleQ2} className="w-full mt-6">确认答案</Button>
          </motion.div>
        )}

        {/* Q3 */}
        {step >= 3 && step < 4 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-glass p-8 rounded-2xl flex-1 flex flex-col">
             <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">探究任务 03</h3>
             <p className="text-sm text-white/80 leading-relaxed mb-6">词云图属于哪类数据呈现方式？(点击右侧按钮给左侧配对)</p>
             <div className="flex justify-between items-center gap-4 mb-auto">
               <div className="space-y-4 flex-1">
                 {[{id:'t1', t:'词云图'}, {id:'t2', t:'柱状图'}, {id:'t3', t:'饼图'}].map(t => (
                   <div key={t.id} className={`p-4 rounded-xl border \${dragMatches[t.id] ? 'bg-brand-gold/20 border-brand-gold text-brand-gold' : 'bg-white/5 border-white/20'} text-center font-bold text-sm`}>
                     {t.t}
                     {dragMatches[t.id] && " ✅"}
                   </div>
                 ))}
               </div>
               
               <div className="space-y-4 flex-1">
                 {[{id:'i3', t:'占比分析'}, {id:'i1', t:'文本数据可视化'}, {id:'i2', t:'数值比较'}].map(i => {
                   const isMatched = Object.values(dragMatches).includes(i.id);
                   if (isMatched) return null;
                   
                   return (
                     <div key={i.id} className="flex flex-col gap-2 p-3 bg-white/5 border border-white/20 rounded-xl">
                       <div className="text-center text-xs font-bold">{i.t}</div>
                       <div className="flex gap-1 justify-center">
                         {!dragMatches['t1'] && <button onClick={() => checkDragMatch('t1', i.id)} className="flex-1 text-[10px] bg-brand-gold/80 rounded py-1 text-black font-bold">词云</button>}
                         {!dragMatches['t2'] && <button onClick={() => checkDragMatch('t2', i.id)} className="flex-1 text-[10px] bg-blue-500/80 rounded py-1 text-white font-bold">柱状</button>}
                         {!dragMatches['t3'] && <button onClick={() => checkDragMatch('t3', i.id)} className="flex-1 text-[10px] bg-purple-500/80 rounded py-1 text-white font-bold">饼图</button>}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          </motion.div>
        )}

        {/* Summary */}
        {step >= 4 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-glass border-2 border-brand-gold p-8 rounded-2xl flex-1 flex flex-col justify-center items-center text-center">
             <div className="text-5xl mb-4">✨</div>
             <h3 className="text-2xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-4">关卡小结</h3>
             <p className="text-lg mb-8 text-white/80">✓ 词云图 = 文本数据 + 词频 + 可视化</p>
             <Button onClick={() => onComplete(score)} className="w-full">继续冒险 →</Button>
          </motion.div>
        )}

      </div>
    </div>
  );
};

