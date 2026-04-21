import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  text: string;
  show: boolean;
  onComplete?: () => void;
}

export const MonkeyDialog: React.FC<Props> = ({ text, show, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!show) {
      setDisplayedText('');
      setIsClosed(false);
      return;
    }
    
    // Reset closed state when a new text or show state comes in
    setIsClosed(false);
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [text, show]);

  const isFinished = displayedText === text && text.length > 0;

  return (
    <AnimatePresence>
      {show && !isClosed && (
        <motion.div
           initial={{ y: 50, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: 20, opacity: 0 }}
           className="w-full flex pointer-events-auto"
        >
          <div className="relative w-full max-w-4xl mx-auto bg-[#140A28]/90 border border-brand-gold/30 rounded-[16px] p-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-end md:items-start gap-[20px]">
            <div className="flex w-full gap-[20px] items-start">
              {/* Avatar */}
              <div className="w-[80px] h-[80px] rounded-full bg-[radial-gradient(circle,var(--color-brand-gold),var(--color-brand-gold-dark))] border-[3px] border-brand-white flex items-center justify-center text-[40px] shrink-0 shadow-[0_4px_12px_rgba(255,140,0,0.4)]">
                🐒
              </div>
              
              {/* Dialog Text */}
              <div className="flex-1 flex flex-col">
                <p className="font-bold text-brand-gold mb-1">孙悟空</p>
                <div className="text-[18px] leading-[1.6] text-brand-white min-h-[60px]">
                  {displayedText}
                </div>
              </div>
            </div>
            
            {/* Acknowledge Button */}
            {isFinished && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsClosed(true)}
                className="shrink-0 bg-brand-gold text-black px-6 py-2 rounded-xl font-bold shadow-md hover:bg-[#FFD700]/90 transition-colors self-end md:self-auto md:ml-auto mt-4 md:mt-0"
              >
                知道了
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

