import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { AIAssistant, LocalMessage } from '../components/AIAssistant';
import { motion, AnimatePresence } from 'motion/react';

const QWEN_API_KEY = "sk-a6ba686f91e34fe087240b3043041e51";

interface AIContextType {
  triggerAI: (instruction: string) => void;
  showLoading: (text: string) => void;
  hideLoading: () => void;
}

export const AIContext = createContext<AIContextType>({ 
  triggerAI: () => {},
  showLoading: () => {},
  hideLoading: () => {}
});
export const useAI = () => useContext(AIContext);

export const AITutorProvider = ({ children, playerName }: { children: ReactNode, playerName: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [globalLoadingText, setGlobalLoadingText] = useState<string | null>(null);

  const [messages, setMessages] = useState<LocalMessage[]>([
    { role: 'system', content: `你是AI助教大圣。本节课带学生体验文本分词、过滤清洗、词频统计、生成词云图。如果遇到[系统动作提示]，说明学生当前操作遇到了困难或者做了错误操作。请你立刻纠正他，并给出正确的操作建议！回复坚决保持西游记悟空口吻，幽默活泼，不要输出markdown代码块，限制在60字以内。`},
    { role: 'assistant', content: `俺老孙来也！${playerName ? playerName : '小朋友'}，有什么不懂的随时问俺！遇到困难或者操作选错了，俺老孙也会立刻跳出来提醒你的！` }
  ]);
  const lastTrigger = useRef(0);

  const callLLM = async (msgs: LocalMessage[]) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QWEN_API_KEY}` },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: msgs.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('API Exception');
      const data = await res.json();
      return data.choices[0].message.content;
    } catch (e) {
      clearTimeout(timeoutId);
      throw new Error('Connection Error');
    }
  };

  const triggerAI = async (instruction: string) => {
    const now = Date.now();
    if (now - lastTrigger.current < 5000 || isAILoading) return;
    lastTrigger.current = now;
    
    setIsOpen(true);
    setIsAILoading(true);
    const newMsgs = [...messages, { role: 'user' as const, content: `[系统动作提示]：${instruction}` }];
    try {
      const reply = await callLLM(newMsgs);
      setMessages(prev => [...prev, { role: 'user', content: instruction, hidden: true }, { role: 'assistant', content: reply }]);
    } catch(e) {
      console.error(e);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const newMsgs: LocalMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setIsAILoading(true);
    try {
      const reply = await callLLM(newMsgs.filter(m => !m.hidden));
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '俺老孙的筋斗云卡住了，被妖怪拦住了网线，再说一遍？' }]);
    } finally {
      setIsAILoading(false);
    }
  };

  const showLoading = (text: string) => setGlobalLoadingText(text);
  const hideLoading = () => setGlobalLoadingText(null);

  return (
    <AIContext.Provider value={{ triggerAI, showLoading, hideLoading }}>
      {children}
      <AIAssistant messages={messages} onSendMessage={handleSendMessage} isOpen={isOpen} setIsOpen={setIsOpen} isLoading={isAILoading} />
      
      {/* Global Loading Overlay */}
      <AnimatePresence>
        {globalLoadingText && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div 
               animate={{ rotate: 360 }} 
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-24 h-24 border-4 border-brand-gold border-t-transparent rounded-full mb-6"
            />
            <motion.div 
               animate={{ scale: [1, 1.05, 1] }} 
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-gold to-white text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]"
            >
              {globalLoadingText}
            </motion.div>
            <p className="text-white/60 mt-4 text-sm font-bold">请耐心等待大圣施法，</p>
            <p className="text-white/60 text-sm font-bold">不要走开或乱点哦！</p>
          </motion.div>
        )}
      </AnimatePresence>
    </AIContext.Provider>
  );
};
