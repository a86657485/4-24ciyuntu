import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface LocalMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  hidden?: boolean;
}

interface Props {
  messages: LocalMessage[];
  onSendMessage: (msg: string) => void;
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  isLoading: boolean;
}

export const AIAssistant: React.FC<Props> = ({ messages, onSendMessage, isOpen, setIsOpen, isLoading }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isLoading]);

  const visibleMessages = messages.filter(m => m.role !== 'system' && !m.hidden);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="bg-[#140A28] border-2 border-brand-gold rounded-2xl w-80 md:w-96 shadow-[0_10px_40px_rgba(0,0,0,0.8)] mb-4 flex flex-col overflow-hidden pointer-events-auto"
            style={{ maxHeight: '60vh' }}
          >
             <div className="bg-brand-gold/20 p-3 border-b border-brand-gold/50 flex justify-between items-center shrink-0">
                <span className="font-bold text-brand-gold flex items-center gap-2">🐒 大圣助教</span>
                <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white text-xl leading-none">&times;</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {visibleMessages.length === 0 && !isLoading && (
                  <p className="text-white/40 text-sm text-center mt-10">向大圣提问吧...</p>
                )}
                {visibleMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 rounded-br-sm' : 'bg-white/10 text-white border border-white/20 rounded-bl-sm'}`}>
                        {m.content}
                     </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                     <div className="p-3 rounded-2xl bg-white/10 text-white/50 border border-white/20 rounded-bl-sm text-sm animate-pulse">
                        大圣思考中...
                     </div>
                  </div>
                )}
                <div ref={endRef} />
             </div>
             
             <div className="p-3 bg-black/40 border-t border-white/10 flex gap-2 shrink-0">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && input.trim() && (onSendMessage(input), setInput(''))}
                  placeholder="遇到困难？问大圣..."
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold text-white"
                />
                <button 
                  onClick={() => input.trim() && (onSendMessage(input), setInput(''))}
                  disabled={isLoading || !input.trim()}
                  className="bg-brand-gold text-black px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  发送
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-brand-gold border-4 border-white shadow-[0_0_20px_rgba(255,215,0,0.6)] flex items-center justify-center text-3xl pointer-events-auto"
        >
           🐒
        </motion.button>
      )}
    </div>
  );
};
