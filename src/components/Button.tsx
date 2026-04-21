import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { playSuccess } from '../utils/audio';

interface Props extends HTMLMotionProps<'button'> {
  variant?: 'gold' | 'glass';
}

export const Button: React.FC<Props> = ({ children, variant = 'gold', onClick, className = '', ...props }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'gold') {
      playSuccess();
    }
    if (onClick) onClick(e);
  };

  const baseClass = variant === 'gold' 
    ? 'btn-gold' 
    : 'bg-glass hover:bg-white/10 text-white font-medium py-3 px-6 rounded-xl border border-white/20 transition-all';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={`\${baseClass} \${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};
