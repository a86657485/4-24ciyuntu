import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onJump: (stage: number) => void;
}

export const TestPanel: React.FC<Props> = ({ onJump }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '112233') {
      setIsAuthenticated(true);
    } else {
      alert('密码错误');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-black/80 hover:border-brand-gold transition-colors"
        title="测试面板"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-14 left-0 w-80 bg-[#140A28]/95 backdrop-blur-xl border border-brand-gold/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-6 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
               <h3 className="text-xl font-bold text-brand-gold">⚙️ 开发测试面板</h3>
               <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            {!isAuthenticated ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-3 mt-4">
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="输入测试密码"
                  className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-gold"
                />
                <button type="submit" className="bg-brand-gold text-black font-bold py-2 rounded-lg hover:bg-brand-gold-dark">
                  进入测试模式
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 mt-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                
                <div className="space-y-2">
                  <h4 className="text-sm text-brand-cyan font-bold">🚀 快速跳转 (跳关)</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => onJump(0)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">0. 初始</button>
                    <button onClick={() => onJump(1)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">1. 介绍</button>
                    <button onClick={() => onJump(2)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">2. 分词</button>
                    <button onClick={() => onJump(3)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">3. 词频</button>
                    <button onClick={() => onJump(4)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">4. 清洗</button>
                    <button onClick={() => onJump(5)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">5. 生成</button>
                    <button onClick={() => onJump(6)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">6. 实战</button>
                    <button onClick={() => onJump(7)} className="col-span-3 bg-white/10 hover:bg-brand-gold hover:text-black py-1 rounded text-xs transition-colors">7. 成绩单 (结束)</button>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm text-brand-red font-bold">📖 关卡参考答案</h4>
                  
                  <div className="bg-black/40 p-3 rounded-lg text-xs space-y-2 text-white/80">
                    <p><strong className="text-white">关卡 1:</strong><br/>Q1: B (出现次数越多字体越大)<br/>Q2: 词语出现的频率、重要程度<br/>Q3: 连线 词云图-文本数据可视化 饼图-占比 柱状-比较</p>
                    
                    <p><strong className="text-white">关卡 2:</strong><br/>Lv1: 唐僧 / 骑马 / 咚咚咚 / 后面 / 跟着 / 孙悟空<br/>Lv2: 悟 空 / 拔 出 / 一 根 / 毫 毛 / 吹 / 口 / 仙 气 / 变 出 / 千 百 个 / 小 猴</p>
                    
                    <p><strong className="text-white">关卡 3:</strong><br/>悟空(4) 妖怪(2) 金箍棒(3) 天宫(2) 法术(2)</p>
                    
                    <p><strong className="text-white">关卡 4:</strong><br/>停用: 的, 了, 在, 也<br/>有效: 孙悟空, 芭蕉扇, 打, 火焰山<br/>同义词: 悟空/大师兄/行者(连🐒), 沙悟净/沙僧(连🧔)</p>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
