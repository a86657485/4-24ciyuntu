import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { playFanfare } from '../utils/audio';

interface Props {
  playerName: string;
  totalXP: number;
  stageResults: number[];
}

export const Outro: React.FC<Props> = ({ playerName, totalXP, stageResults }) => {
  useEffect(() => {
    playFanfare();
  }, []);

  const getBadge = () => {
    if (totalXP >= 141) return { icon: '👑', name: '大师级', color: 'from-yellow-400 to-yellow-600' };
    if (totalXP >= 101) return { icon: '🏆', name: '悟道级', color: 'from-purple-400 to-purple-600' };
    if (totalXP >= 61) return { icon: '⚡', name: '弟子级', color: 'from-blue-400 to-blue-600' };
    return { icon: '🌱', name: '学徒级', color: 'from-green-400 to-green-600' };
  };

  const badge = getBadge();
  const maxXP = 150; // max possible xp appx

  const handleShare = () => {
    const text = `我在词云图大冒险里获得了【\${badge.name}】称号！总共收集了 \${totalXP} 个金币经验！一起来发现《西游记》的主角吧！`;
    navigator.clipboard.writeText(text);
    alert('成绩已复制到剪贴板！');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 w-full max-w-2xl mx-auto">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, type: "spring" }}
        className="bg-glass border border-brand-gold/30 p-8 rounded-3xl w-full text-center relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-gold blur-[100px] opacity-30 rounded-full pointer-events-none" />
        
        <h2 className="text-3xl font-bold text-white mb-2">取经完成！</h2>
        <p className="text-gray-300">干得漂亮，{playerName}！</p>
        
        <motion.div 
           initial={{ scale: 0, rotate: -180 }}
           animate={{ scale: 1, rotate: 0 }}
           transition={{ delay: 0.5, type: 'spring', bounce: 0.6 }}
           className={`w-32 h-32 mx-auto my-8 rounded-full bg-gradient-to-br \${badge.color} flex flex-col items-center justify-center shadow-2xl border-4 border-white/20`}
        >
           <span className="text-5xl">{badge.icon}</span>
           <span className="font-bold text-white mt-1 drop-shadow-md">{badge.name}</span>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="space-y-4 mb-8 text-left max-w-sm mx-auto">
           <div className="flex justify-between items-center border-b border-white/10 pb-2">
             <span className="text-gray-300">总计经验 (XP)</span>
             <span className="text-2xl font-bold text-brand-gold">{totalXP}</span>
           </div>
           
           <div className="space-y-2 mt-4 text-sm text-gray-400">
             <div className="flex justify-between">
               <span>关卡1：认识词云</span>
               <span>+{stageResults[0] || 0} XP</span>
             </div>
             <div className="flex justify-between">
               <span>关卡2：文本分词</span>
               <span>+{stageResults[1] || 0} XP</span>
             </div>
             <div className="flex justify-between">
               <span>关卡3：词频统计</span>
               <span>+{stageResults[2] || 0} XP</span>
             </div>
             <div className="flex justify-between">
               <span>关卡4：筛选有效词</span>
               <span>+{stageResults[3] || 0} XP</span>
             </div>
             <div className="flex justify-between">
               <span>关卡5：生成词云图</span>
               <span>+{stageResults[4] || 0} XP</span>
             </div>
           </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.5 }}>
           <Button onClick={handleShare} className="w-full sm:w-auto px-12 py-4 text-lg">
             分享成绩单 🏆
           </Button>
           
           <button onClick={() => window.location.reload()} className="block mt-6 text-gray-400 hover:text-white mx-auto underline text-sm transition-colors">
             重新开始取经
           </button>
        </motion.div>
      </motion.div>
    </div>
  );
};
