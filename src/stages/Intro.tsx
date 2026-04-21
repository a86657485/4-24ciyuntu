import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';

interface Props {
  onStart: (name: string) => void;
}

export const Intro: React.FC<Props> = ({ onStart }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setStep(1);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      {step === 0 && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="text-gold-gradient font-bold text-3xl md:text-5xl"
        >
          花果山水帘洞，孙悟空正在研究一件神奇的事...
        </motion.div>
      )}

      {step >= 1 && (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-8">
           <div className="w-full absolute bottom-10 left-0 px-4 md:px-10">
             <MonkeyDialog 
               text="俺老孙发现，把一本书里的词语按出现次数大小摆出来，竟然能看出谁是主角！你来帮俺破解这个秘密吧！"
               show={step >= 1}
               onComplete={() => setStep(2)}
             />
           </div>

           {step >= 2 && (
             <motion.div
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="flex flex-col items-center space-y-6 w-full max-w-md bg-glass p-8 relative z-10"
             >
                <h2 className="text-2xl font-bold text-gold-gradient">登入仙境</h2>
                <div className="relative w-full">
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="输入你的大名" 
                    className="w-full bg-black/20 text-center text-xl py-4 rounded-xl text-white placeholder-white/50 border border-white/20 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                  />
                </div>
                
                <Button 
                   onClick={() => onStart(name || '神秘旅人')}
                   disabled={!name}
                   className={!name ? 'opacity-50 cursor-not-allowed w-full text-lg mt-4' : 'w-full text-lg mt-4'}
                >
                   开始取经
                </Button>
             </motion.div>
           )}
        </div>
      )}
    </div>
  );
};

