import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './Button';

interface PasswordLockProps {
  correctPassword: string;
  onUnlock: () => void;
  stageName: string;
  onJump?: (stage: number) => void;
}

export const PasswordLock: React.FC<PasswordLockProps> = ({ correctPassword, onUnlock, stageName, onJump }) => {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal === correctPassword) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setInputVal('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="max-w-md w-full mx-auto p-10 bg-glass border-2 border-brand-cyan/50 rounded-3xl shadow-[0_0_40px_rgba(26,188,156,0.2)]"
      >
        <div className="text-7xl mb-6 text-center animate-bounce">🔒</div>
        <h2 className="text-2xl font-bold text-center mb-2 text-white">前方高能阵法：{stageName}</h2>
        <p className="text-white/70 text-center mb-6 leading-relaxed">
          此处已被太上老君设下仙家结界。<br/>
          需要仙门老师分发的<strong className="text-brand-gold text-lg px-2 shadow-brand-gold drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]">「数字钥匙」</strong>方可解开！
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div>
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value.trim());
                setError(false);
              }}
              placeholder="请输入数字钥匙"
              className="w-full p-4 bg-black/50 border-2 border-brand-cyan/30 rounded-xl text-center text-3xl tracking-[0.2em] font-mono font-bold text-white outline-none focus:border-brand-cyan transition-colors"
            />
          </div>
          <div className="h-6 -my-4 mb-2">
             {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-center font-bold text-sm">⚠️ 钥匙不正确，请向老师请求支援！</motion.p>}
          </div>
          <Button className="w-full py-4 text-xl">开启结界 🔓</Button>
        </form>

        {onJump && (
          <div className="mt-8 pt-6 border-t border-white/10 w-full animate-fade-in">
            <p className="text-white/60 text-sm text-center mb-4">等待钥匙时，可以去前面的修炼场复习一下哦：</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => onJump(1)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">1. 初识词云图</button>
              <button onClick={() => onJump(2)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">2. 分词</button>
              <button onClick={() => onJump(3)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">3. 去废词</button>
              <button onClick={() => onJump(4)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">4. 算词频</button>
              <button onClick={() => onJump(5)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">5. 合并同义词</button>
              <button onClick={() => onJump(6)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">6. 生成</button>
              {stageName === "终极测验" && (
                <button onClick={() => onJump(7)} className="bg-white/5 hover:bg-brand-cyan/20 text-white/80 py-1.5 px-3 rounded-lg text-xs transition-colors border border-white/10 hover:border-brand-cyan/50">7. 实战演练</button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
