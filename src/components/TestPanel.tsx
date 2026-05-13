import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onJump: (stage: number, options?: { teacherTest?: boolean }) => void;
}

export const TestPanel: React.FC<Props> = ({ onJump }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const jumpAsTeacherTest = (stage: number) => {
    onJump(stage, { teacherTest: true });
  };

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
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => jumpAsTeacherTest(0)} className="col-span-2 bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">0. 登入仙境</button>
                    <button onClick={() => jumpAsTeacherTest(1)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">1. 初识词云图</button>
                    <button onClick={() => jumpAsTeacherTest(2)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">2. 分词</button>
                    <button onClick={() => jumpAsTeacherTest(3)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">3. 去废词</button>
                    <button onClick={() => jumpAsTeacherTest(4)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">4. 算词频</button>
                    <button onClick={() => jumpAsTeacherTest(5)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">5. 合并同义词</button>
                    <button onClick={() => jumpAsTeacherTest(6)} className="bg-white/10 hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors">6. 生成</button>
                    <button onClick={() => jumpAsTeacherTest(7)} className="bg-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-black py-1.5 rounded text-xs transition-colors border border-brand-gold/50">7. 实战演练</button>
                    <button onClick={() => jumpAsTeacherTest(8)} className="bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white py-1.5 rounded text-xs transition-colors border border-purple-500/50">8. 终极测验</button>
                    <button onClick={() => jumpAsTeacherTest(9)} className="col-span-2 bg-white/10 hover:bg-brand-gold hover:text-black py-2 rounded text-xs transition-colors">9. 结算报告</button>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm text-brand-red font-bold">📖 关卡参考答案</h4>
                  
                  <div className="bg-black/40 p-3 rounded-lg text-[11px] space-y-2 text-white/80 leading-relaxed">
                    <p><strong className="text-white">关卡 1:</strong><br/>Q1: 出现次数最多<br/>Q2: 词语出现的频率、重要程度</p>
                    
                    <p><strong className="text-white">关卡 2:</strong><br/>Lv1: 唐僧 / 骑马 / 咚咚咚 / 后面 / 跟着 / 孙悟空<br/>Lv2: 悟空 / 拔出 / 一根 / 毫毛 / 吹 / 口 / 仙气 / 变出 / 千百个 / 小猴</p>
                    
                    <p><strong className="text-white">关卡 3 (去废词):</strong><br/>停用: 的, 了, 在, 也<br/>有效: 孙悟空, 芭蕉扇, 打, 火焰山</p>
                    
                    <p><strong className="text-white">关卡 4 (算词频):</strong><br/>悟空(4) 妖怪(2) 金箍棒(3) 天宫(2) 法术(2)</p>

                    <p><strong className="text-white">关卡 5 (合并同义词):</strong><br/>悟空/大师兄/行者(连🐒)，妖怪/怪(连👹)，金箍棒/棒子(连🗡️)</p>

                    <p><strong className="text-white">关卡 8 (测验):</strong><br/>共15题，均取自信息课理论</p>
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
