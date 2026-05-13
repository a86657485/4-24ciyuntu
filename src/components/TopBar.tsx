import React from 'react';
import { motion } from 'motion/react';

interface Props {
  stage: number;
  xp: number;
}

const FLOW_STEPS = ['初识词云图', '分词', '去废词', '算词频', '合并同义词', '生成', '实战演练', '终极测验'];

export const TopBar: React.FC<Props> = ({ stage, xp }) => {
  const activeIndex = Math.min(Math.max(stage - 1, 0), FLOW_STEPS.length - 1);

  return (
    <div className="h-[72px] w-full px-4 md:px-10 flex items-center justify-between gap-4 z-50 bg-[#061022]/90 border-b border-brand-cyan/20 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="hidden md:block text-xs text-white/58 tracking-[0.18em] uppercase">
        第24课：抽取文本汇词云
      </div>

      <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto pr-2">
        {FLOW_STEPS.map((name, index) => {
          const isActive = index <= activeIndex;

          return (
            <React.Fragment key={name}>
              <span className={`shrink-0 text-sm sm:text-base font-bold whitespace-nowrap transition-colors ${isActive ? 'text-brand-cyan drop-shadow-[0_0_8px_rgba(26,188,156,0.65)]' : 'text-white/58'}`}>
                {name}
              </span>
              {index < FLOW_STEPS.length - 1 && (
                <span className={`shrink-0 ${index < activeIndex ? 'text-brand-cyan/70' : 'text-white/28'} text-sm sm:text-base`}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-2 sm:gap-6 ml-auto">
        <div className="bg-brand-red/20 border border-brand-red px-3 sm:px-4 py-1 rounded-full text-brand-gold font-bold text-sm">
          XP <motion.span key={xp} initial={{ scale: 1.5, color: '#fff' }} animate={{ scale: 1, color: '#FFD700' }}>{Math.floor(xp).toString().padStart(4, '0')}</motion.span>
        </div>
      </div>
    </div>
  );
};
