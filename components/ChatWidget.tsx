
import React, { useState, useRef, useEffect } from 'react';
import { WidgetSettings, Message, User, PluginConfig } from '../types';
import { apiService } from '../services/apiService';

interface Props {
  settings: WidgetSettings;
  userId: string;
  forceOpen?: boolean; // New Prop for Embed Mode
  onClose?: () => void; // New Prop for Embed Mode
  isEmbed?: boolean; // New Prop to adjust layout
  initialPlugins?: PluginConfig | null; // Pass plugins from parent to avoid double fetch/logic split
  onToggleAutoOpen?: () => void; // New prop for toggling auto-open preference
  isAutoOpenBlocked?: boolean; // New prop for auto-open state
}

const ChatWidget: React.FC<Props> = ({ settings, userId, forceOpen, onClose, isEmbed, initialPlugins, onToggleAutoOpen, isAutoOpenBlocked }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: settings.welcomeMessage, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState('');
  
  // Plugin States
  const [plugins, setPlugins] = useState<any>(initialPlugins || null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '' });
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  // Sync internal state with external forceOpen prop
  useEffect(() => {
      if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);

  // Initialize Session ID & Fetch Plugins (if not provided)
  useEffect(() => {
    // 1. Session Logic
    let storedSessionId = localStorage.getItem('bibichat_session_id');
    if (!storedSessionId) {
        storedSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('bibichat_session_id', storedSessionId);
    }
    setSessionId(storedSessionId);

    // 2. Plugins Logic
    if (!plugins) {
        const fetchPlugins = async () => {
            const p = await apiService.getPlugins(userId);
            setPlugins(p);
            
            // Auto Open Logic - Only if not forced (embed mode handles its own open state usually via button, but autoOpen can trigger it too)
            // NOTE: Embed mode auto-open is now handled in StandaloneChatWidget (App.tsx)
            if (p.autoOpen?.enabled && !isEmbed) {
                setTimeout(() => setIsOpen(true), p.autoOpen.delay * 1000);
            }
        };
        fetchPlugins();
    }
  }, [userId, isEmbed]);

  // Effect to scroll bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, showLeadForm]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      setMessages([{ ...messages[0], text: settings.welcomeMessage }]);
    }
  }, [settings.welcomeMessage]);
  
  // Handle Auto-show Lead Form when opened
  useEffect(() => {
      if (isOpen && plugins?.leadForm?.enabled && plugins?.leadForm?.trigger === 'on_open' && !leadSubmitted && !showLeadForm) {
          setShowLeadForm(true);
      }
  }, [isOpen, plugins]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await apiService.chat(userId, input, settings.botName, sessionId);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Hệ thống đang bận. Vui lòng thử lại sau.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitLead = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!leadForm.name || !leadForm.phone) return;
      await apiService.submitLead(userId, leadForm.name, leadForm.phone, leadForm.email);
      setLeadSubmitted(true);
      setShowLeadForm(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Cảm ơn bạn! Chúng mình sẽ liên hệ sớm nha.", timestamp: Date.now() }]);
  };

  const handleToggle = () => {
      if (onClose) {
          onClose();
      } else {
          setIsOpen(!isOpen);
      }
  };

  // --- EMBEDDED MODE RENDER ---
  if (isEmbed) {
      // Specialized Render for Embed Iframe (Full Height/Width of container)
      return (
        <div className="w-full h-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100/50">
          {/* Header */}
          <div className="p-4 text-white relative overflow-hidden shrink-0" style={{ backgroundColor: settings.primaryColor }}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <i className="fa-solid fa-robot text-6xl"></i>
            </div>
            
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
                        <i className="fa-solid fa-robot text-lg"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-base">{settings.botName}</h3>
                        <div className="flex items-center text-[10px] opacity-90 font-medium bg-white/20 px-2 py-0.5 rounded-full w-fit mt-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                        Trực tuyến
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* NEW: Auto-Open Toggle Button */}
                    {onToggleAutoOpen && (
                        <button 
                            onClick={onToggleAutoOpen}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${isAutoOpenBlocked ? 'bg-white text-rose-500 border-white' : 'bg-white/20 text-white hover:bg-white/40 border-white/20'}`}
                            title={isAutoOpenBlocked ? "Bật lại tự động mở chat" : "Tắt tự động mở chat khi vào trang"}
                        >
                            <i className={`fa-solid ${isAutoOpenBlocked ? 'fa-bell-slash' : 'fa-bell' } text-xs`}></i>
                        </button>
                    )}

                    {/* Social Plugin Icons for Embed Mode */}
                    {plugins?.social?.enabled && (
                        <div className="flex gap-2">
                             {plugins.social.phone && (
                                 <a href={`tel:${plugins.social.phone}`} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors border border-white/20" title="Gọi Hotline" target="_blank" rel="noreferrer">
                                     <i className="fa-solid fa-phone text-xs"></i>
                                 </a>
                             )}
                             {plugins.social.zalo && (
                                 <a href={`https://zalo.me/${plugins.social.zalo}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors border border-white/20" title="Chat Zalo">
                                     <div className="font-bold text-[8px]">Zalo</div>
                                 </a>
                             )}
                        </div>
                    )}

                    {/* Close Button for Embed */}
                    <button onClick={handleToggle} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors ml-1">
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 p-5 bg-slate-50 space-y-4 overflow-y-auto relative no-scrollbar">
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
            
            {showLeadForm && (
                <div className="mx-4 my-4 bg-white p-5 rounded-2xl shadow-lg border-2 border-slate-100 animate-in zoom-in duration-300 relative z-10">
                     <button onClick={() => setShowLeadForm(false)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1"><i className="fa-solid fa-xmark"></i></button>
                     <div className="text-center mb-4">
                        <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                            <i className="fa-solid fa-address-card"></i>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{plugins.leadForm.title || "Vui lòng để lại thông tin"}</h4>
                     </div>
                     <form onSubmit={submitLead} className="space-y-3">
                         <input 
                            required 
                            type="text" 
                            placeholder="Tên của bạn *" 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 font-bold" 
                            value={leadForm.name} 
                            onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng cho mình biết tên bạn nhé!')}
                            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                         />
                         <input 
                            required 
                            type="tel" 
                            placeholder="Số điện thoại *" 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 font-bold" 
                            value={leadForm.phone} 
                            onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Nhập số điện thoại để mình gọi lại nha!')}
                            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                         />
                         <input type="email" placeholder="Email (không bắt buộc)" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 font-bold" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                         <button type="submit" className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-sm shadow-md transition-colors">Gửi thông tin</button>
                     </form>
                </div>
            )}
            {isLoading && (<div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex space-x-1.5 items-center"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div></div></div>)}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 relative z-20">
            {plugins?.leadForm?.enabled && plugins?.leadForm?.trigger === 'manual' && !leadSubmitted && !showLeadForm && (
                <button onClick={() => setShowLeadForm(true)} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-pink-200 text-pink-500 px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-pink-50 transition-colors flex items-center gap-1 whitespace-nowrap"><i className="fa-regular fa-hand-point-up"></i> Để lại SĐT tư vấn</button>
            )}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Nhập tin nhắn..." className="flex-1 text-sm bg-transparent outline-none px-4 py-2 text-slate-700 placeholder:text-slate-400 font-medium" disabled={isLoading} />
              <button onClick={handleSend} className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-transform active:scale-90 shadow-md" style={{ backgroundColor: settings.primaryColor }}><i className="fa-solid fa-paper-plane text-sm"></i></button>
            </div>
             <div className="text-[10px] text-center text-slate-400 mt-2 font-bold flex items-center justify-center gap-1">
                <a href="https://bibichat.me" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                    <i className="fa-solid fa-bolt text-amber-400"></i> by BibiChat AI
                </a>
             </div>
          </div>
        </div>
      );
  }

  // --- STANDARD PREVIEW/DEMO RENDER (NOT EMBED) ---
  
  // Calculate positioning classes based on corners and centers
  let buttonPositionClass = '';
  let windowPositionClass = '';
  let animateClass = '';

  const pos = settings.position || 'bottom-right';

  // Determine button fixed position
  switch (pos) {
      case 'bottom-right':
      case 'right' as any:
          buttonPositionClass = 'bottom-6 right-6';
          windowPositionClass = 'bottom-24 right-6';
          animateClass = 'slide-in-from-bottom-10';
          break;
      case 'bottom-left':
      case 'left' as any:
          buttonPositionClass = 'bottom-6 left-6';
          windowPositionClass = 'bottom-24 left-6';
          animateClass = 'slide-in-from-bottom-10';
          break;
      case 'top-right':
          buttonPositionClass = 'top-6 right-6';
          windowPositionClass = 'top-24 right-6';
          animateClass = 'slide-in-from-top-10';
          break;
      case 'top-left':
          buttonPositionClass = 'top-6 left-6';
          windowPositionClass = 'top-24 left-6';
          animateClass = 'slide-in-from-top-10';
          break;
      case 'top-center':
          buttonPositionClass = 'top-6 left-1/2 -translate-x-1/2';
          windowPositionClass = 'top-24 left-1/2 -translate-x-1/2';
          animateClass = 'slide-in-from-top-10';
          break;
      case 'bottom-center':
          buttonPositionClass = 'bottom-6 left-1/2 -translate-x-1/2';
          windowPositionClass = 'bottom-24 left-1/2 -translate-x-1/2';
          animateClass = 'slide-in-from-bottom-10';
          break;
      case 'left-center':
          buttonPositionClass = 'top-1/2 left-6 -translate-y-1/2';
          windowPositionClass = 'bottom-24 left-6'; // Window defaults to bottom-left area even for center button to avoid covering too much
          animateClass = 'slide-in-from-bottom-10';
          break;
      case 'right-center':
          buttonPositionClass = 'top-1/2 right-6 -translate-y-1/2';
          windowPositionClass = 'bottom-24 right-6'; // Window defaults to bottom-right area
          animateClass = 'slide-in-from-bottom-10';
          break;
      default:
          buttonPositionClass = 'bottom-6 right-6';
          windowPositionClass = 'bottom-24 right-6';
          animateClass = 'slide-in-from-bottom-10';
  }

  return (
    <div className={`fixed ${buttonPositionClass} z-[9999] font-sans`}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl transition-all hover:scale-110 active:scale-95 duration-300 relative group" 
        style={{ backgroundColor: settings.primaryColor }}
      >
        <span className="absolute inset-0 rounded-full bg-white opacity-20 group-hover:animate-ping"></span>
        {isOpen ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-comment-dots"></i>}
      </button>

      {isOpen && (
        // Render window fixed relative to viewport for demo/standard usage to ensure it overlays content
        <div className={`fixed ${windowPositionClass} w-[calc(100vw-3rem)] sm:w-[380px] h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in ${animateClass} duration-300 border border-slate-100/50`}>
          {/* Header */}
          <div className="p-4 text-white relative overflow-hidden shrink-0" style={{ backgroundColor: settings.primaryColor }}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <i className="fa-solid fa-robot text-6xl"></i>
            </div>
            
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
                        <i className="fa-solid fa-robot text-lg"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-base">{settings.botName}</h3>
                        <div className="flex items-center text-[10px] opacity-90 font-medium bg-white/20 px-2 py-0.5 rounded-full w-fit mt-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                        Trực tuyến
                        </div>
                    </div>
                </div>
                
                {/* Social Plugin Icons */}
                {plugins?.social?.enabled && (
                    <div className="flex gap-2">
                         {plugins.social.phone && (
                             <a href={`tel:${plugins.social.phone}`} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors border border-white/20" title="Gọi Hotline">
                                 <i className="fa-solid fa-phone text-xs"></i>
                             </a>
                         )}
                         {plugins.social.zalo && (
                             <a href={`https://zalo.me/${plugins.social.zalo}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors border border-white/20" title="Chat Zalo">
                                 <div className="font-bold text-[8px]">Zalo</div>
                             </a>
                         )}
                    </div>
                )}
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 p-5 bg-slate-50 space-y-4 overflow-y-auto relative">
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
            
            {showLeadForm && (
                <div className="mx-4 my-4 bg-white p-5 rounded-2xl shadow-lg border-2 border-slate-100 animate-in zoom-in duration-300 relative z-10">
                     <button onClick={() => setShowLeadForm(false)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1"><i className="fa-solid fa-xmark"></i></button>
                     <div className="text-center mb-4">
                        <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                            <i className="fa-solid fa-address-card"></i>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{plugins.leadForm.title || "Vui lòng để lại thông tin"}</h4>
                     </div>
                     <form onSubmit={submitLead} className="space-y-3">
                         <input 
                            required 
                            type="text" 
                            placeholder="Tên của bạn *" 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 font-bold" 
                            value={leadForm.name} 
                            onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng nhập tên của bạn nhé!')}
                            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                         />
                         <input 
                            required 
                            type="tel" 
                            placeholder="Số điện thoại *" 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 font-bold" 
                            value={leadForm.phone} 
                            onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng nhập số điện thoại nhé!')}
                            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                         />
                         <input type="email" placeholder="Email (không bắt buộc)" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 font-bold" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                         <button type="submit" className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-sm shadow-md transition-colors">Gửi thông tin</button>
                     </form>
                </div>
            )}

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

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 relative z-20">
            {plugins?.leadForm?.enabled && plugins?.leadForm?.trigger === 'manual' && !leadSubmitted && !showLeadForm && (
                <button onClick={() => setShowLeadForm(true)} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-pink-200 text-pink-500 px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-pink-50 transition-colors flex items-center gap-1 whitespace-nowrap"><i className="fa-regular fa-hand-point-up"></i> Để lại SĐT tư vấn</button>
            )}

            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Nhập tin nhắn..." className="flex-1 text-sm bg-transparent outline-none px-4 py-2 text-slate-700 placeholder:text-slate-400 font-medium" disabled={isLoading} />
              <button onClick={handleSend} className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-transform active:scale-90 shadow-md" style={{ backgroundColor: settings.primaryColor }}><i className="fa-solid fa-paper-plane text-sm"></i></button>
            </div>
            <div className="text-[10px] text-center text-slate-400 mt-2 font-bold flex items-center justify-center gap-1">
                <a href="https://bibichat.me" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                    <i className="fa-solid fa-bolt text-amber-400"></i> by BibiChat AI
                </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
