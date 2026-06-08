import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { AIAssistant, LocalMessage } from '../components/AIAssistant';

interface AIContextType {
  triggerAI: (instruction: string) => void;
}

export const AIContext = createContext<AIContextType>({ triggerAI: () => {} });
export const useAI = () => useContext(AIContext);

export const AITutorProvider = ({ children, playerName }: { children: ReactNode, playerName: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([
    { role: 'system', content: `你是AI助教大圣。本节课带学生体验初识词云图、分词、去废词、算词频、合并同义词、生成词云图。如果遇到[系统动作提示]，说明学生当前操作遇到了困难或者做了错误操作。请你立刻纠正他，并给出正确的操作建议！回复坚决保持西游记悟空口吻，幽默活泼，不要输出markdown代码块，限制在60字以内。`},
    { role: 'assistant', content: `俺老孙来也！${playerName ? playerName : '小朋友'}，有什么不懂的随时问俺！遇到困难或者操作选错了，俺老孙也会立刻跳出来提醒你的！` }
  ]);
  const lastTrigger = useRef(0);

  const callDeepSeek = async (msgs: LocalMessage[]) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('API Exception');
      const data = await res.json();
      return data.content;
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
      const reply = await callDeepSeek(newMsgs);
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
      const reply = await callDeepSeek(newMsgs.filter(m => !m.hidden));
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '俺老孙的筋斗云卡住了，被妖怪拦住了网线，再说一遍？' }]);
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <AIContext.Provider value={{ triggerAI }}>
      {children}
      <AIAssistant messages={messages} onSendMessage={handleSendMessage} isOpen={isOpen} setIsOpen={setIsOpen} isLoading={isAILoading} />
    </AIContext.Provider>
  );
};
