import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface OperationGuideContent {
  title: string;
  tips: string[];
}

interface Props {
  guideKey: number;
  guide?: OperationGuideContent;
}

export const OperationGuide: React.FC<Props> = ({ guideKey, guide }) => {
  const [isOpen, setIsOpen] = useState(Boolean(guide));

  useEffect(() => {
    setIsOpen(Boolean(guide));
  }, [guideKey, guide]);

  if (!guide) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-bg-deep/88 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 18 }}
            className="w-full max-w-xl rounded-2xl border border-brand-gold/45 bg-[#140A28]/95 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
          >
            <h2 className="mb-5 text-center text-2xl font-bold text-brand-gold">{guide.title}</h2>
            <div className="space-y-3 text-base leading-relaxed text-white/86">
              {guide.tips.map((tip, index) => (
                <div key={index} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-cyan text-sm font-bold text-black">
                    {index + 1}
                  </span>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-7 w-full rounded-xl bg-brand-gold py-3 text-lg font-bold text-black shadow-[0_0_18px_rgba(255,215,0,0.35)] transition-colors hover:bg-[#FFE45C]"
            >
              我已了解如何操作
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
