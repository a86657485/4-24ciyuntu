import React from 'react';
import { motion } from 'motion/react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ 
        backgroundImage: 'radial-gradient(white 1px, transparent 0)', 
        backgroundSize: '50px 50px' 
      }} />
      <div className="absolute top-0 left-0 right-0 h-32 opacity-15 select-none w-[200%]">
        <motion.div
           className="w-full h-full"
           animate={{ x: [0, '-50%'] }}
           transition={{ ease: 'linear', duration: 40, repeat: Infinity }}
        >
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
            <path d="M0 80 Q 50 60 100 80 T 200 80 T 300 80 T 400 80 T 500 80 T 600 80 T 700 80 T 800 80 T 900 80 T 1000 80" stroke="rgba(255,255,255,0.2)" fill="transparent" strokeWidth="2"/>
            <path d="M1000 80 Q 1050 60 1100 80 T 1200 80 T 1300 80 T 1400 80 T 1500 80 T 1600 80 T 1700 80 T 1800 80 T 1900 80 T 2000 80" stroke="rgba(255,255,255,0.2)" fill="transparent" strokeWidth="2"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
};
