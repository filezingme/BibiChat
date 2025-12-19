
import React, { useState, useRef, useEffect } from 'react';
import { WidgetSettings, Message } from '../types';
import { apiService } from '../services/apiService';

interface Props {
  settings: WidgetSettings;
  userId: string;
}

const ChatWidget: React.FC<Props> = ({ settings, userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: settings.welcomeMessage, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      setMessages([{ ...messages[0], text: settings.welcomeMessage }]);
    }
  }, [settings.welcomeMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await apiService.chat(userId, input, settings.botName);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Hệ thống đang bận. Vui lòng thử lại sau.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-6 ${settings.position === 'right' ? 'right-6' : 'left-6'} z-[9999] font-sans`}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl transition-all hover:scale-110 active:scale-95 duration-300 relative group" 
        style={{ backgroundColor: settings.primaryColor }}
      >
        <span className="absolute inset-0 rounded-full bg-white opacity-20 group-hover:animate-ping"></span>
        {isOpen ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-comment-dots"></i>}
      </button>

      {isOpen && (
        <div className={`absolute bottom-24 ${settings.position === 'right' ? 'right-0' : 'left-0'} w-[calc(100vw-3rem)] sm:w-[380px] h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 border border-slate-100/50`}>
          {/* Header */}
          <div className="p-5 text-white relative overflow-hidden" style={{ backgroundColor: settings.primaryColor }}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <i className="fa-solid fa-robot text-6xl"></i>
            </div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
                <i className="fa-solid fa-robot text-xl"></i>
              </div>
              <div>
                <h3 className="font-bold text-lg">{settings.botName}</h3>
                <div className="flex items-center text-xs opacity-90 font-medium bg-white/20 px-2 py-0.5 rounded-full w-fit mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                  Trực tuyến
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 p-5 bg-slate-50 space-y-4 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 text-sm font-medium shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none'
                }`} style={msg.role === 'user' ? { backgroundColor: settings.primaryColor } : {}}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex space-x-1.5 items-center">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                placeholder="Nhập tin nhắn..." 
                className="flex-1 text-sm bg-transparent outline-none px-4 py-2 text-slate-700 placeholder:text-slate-400 font-medium" 
                disabled={isLoading} 
              />
              <button 
                onClick={handleSend} 
                className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-transform active:scale-90 shadow-md"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </button>
            </div>
            <div className="text-[10px] text-center text-slate-400 mt-2 font-bold flex items-center justify-center gap-1">
              <i className="fa-solid fa-bolt text-amber-400"></i> by BibiChat AI
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
