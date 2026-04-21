import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shirt, Moon, Flame, Mountain } from 'lucide-react';

interface Props {
  stage: number;
  xp: number;
}

const STAGES = [
  { id: 1, name: '五行山', icon: '⚡' },
  { id: 2, name: '高老庄', icon: '✨' },
  { id: 3, name: '流沙河', icon: '🌙' },
  { id: 4, name: '火焰山', icon: '🔥' },
  { id: 5, name: '灵山', icon: '🔱' },
];

export const TopBar: React.FC<Props> = ({ stage, xp }) => {
  return (
    <div className="h-[100px] md:h-[120px] w-full px-4 md:px-10 flex items-center justify-between z-50 bg-black/40 border-b-2 border-brand-gold/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      
      {/* Route map progress */}
      <div className="flex items-center gap-2 md:gap-4">
        {STAGES.map((s, index) => {
          const isActive = stage >= s.id;
          
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center relative">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-[3px] transition-colors duration-300 ${isActive ? 'border-brand-gold bg-brand-gold text-bg-deep shadow-[0_0_20px_#FFD700]' : 'border-white/20 bg-white/5 text-white/50'} text-xl md:text-3xl`}>
                  {s.icon}
                </div>
                <span className={`text-[12px] md:text-[14px] absolute -bottom-7 whitespace-nowrap font-bold ${isActive ? 'text-brand-gold drop-shadow-md' : 'text-white/40'}`}>
                  {s.name}
                </span>
              </div>
              
              {index < STAGES.length - 1 && (
                <div className={`w-8 md:w-20 h-[3px] md:h-[4px] overflow-hidden ${stage > s.id ? 'bg-gradient-to-r from-brand-gold to-brand-gold/10' : 'bg-white/10'}`}>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-4 sm:gap-8 ml-auto">
        <div className="text-[12px] sm:text-sm md:text-base text-white/70 uppercase tracking-widest hidden sm:block font-bold drop-shadow-md">第 24 课：抽取文本汇词云</div>
        <div className="bg-brand-red/30 border-2 border-brand-red px-5 sm:px-6 py-2 md:py-3 rounded-full text-brand-gold font-black text-lg md:text-2xl shadow-[0_0_15px_rgba(192,57,43,0.6)]">
          XP <motion.span key={xp} initial={{ scale: 1.5, color: '#fff' }} animate={{ scale: 1, color: '#FFD700' }}>{Math.floor(xp).toString().padStart(4, '0')}</motion.span>
        </div>
      </div>
    </div>
  );
};


