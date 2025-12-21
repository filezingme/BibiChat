
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { User, ConversationUser, DirectMessage } from '../types';

interface Props {
  user: User;
  initialChatUserId?: string | null;
  onClearTargetUser?: () => void;
}

// Updated Stable Sticker List (Legacy Giphy IDs for reliability)
const STICKERS = [
    "https://media.giphy.com/media/MDJ9IbxxvDuQA/giphy.gif", // Dance Cat
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", // Hello
    "https://media.giphy.com/media/vTKfa32Y2X5Ic/giphy.gif", // Love
    "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif", // Shocked
    "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif", // Sad
    "https://media.giphy.com/media/C9x8gXo5CnGtO/giphy.gif", // Angry
    "https://media.giphy.com/media/3o7TKmHNHOvHCryVjf/giphy.gif", // Excited
    "https://media.giphy.com/media/l4KibWpBGWchSqCRy/giphy.gif", // Cry
    "https://media.giphy.com/media/3o7TKDkDbIDJieo1sk/giphy.gif", // Laugh
    "https://media.giphy.com/media/10t57cXgo7x5kI/giphy.gif", // Confused
    "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif", // Sleepy
    "https://media.giphy.com/media/l0HlHFRbmaZtVBhXYd/giphy.gif", // Party
    "https://media.giphy.com/media/QvBoMEcTKDCRjHzwM7/giphy.gif", // OK
    "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", // Good job
    "https://media.giphy.com/media/26AHvcW0LB97W8dfi/giphy.gif", // Wow
];

const EMOJIS = ['😀', '😂', '😍', '😎', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '👀', '✨', '💯', '🤔', '😅', '🤮', '😴', '🥳', '👻'];

const REACTIONS = ['❤️', '😆', '😮', '😢', '😡', '👍'];

const CommunityChat: React.FC<Props> = ({ user, initialChatUserId, onClearTargetUser }) => {
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Ref for input field
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // New UI States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);

  // Refs for Click Outside
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const stickerBtnRef = useRef<HTMLButtonElement>(null);

  // Handle Click Outside to Close Pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Emoji Picker
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiBtnRef.current?.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }

      // Close Sticker Picker
      if (
        showStickerPicker &&
        stickerPickerRef.current &&
        !stickerPickerRef.current.contains(event.target as Node) &&
        !stickerBtnRef.current?.contains(event.target as Node)
      ) {
        setShowStickerPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showStickerPicker]);

  // Load conversations list
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000); 
    return () => clearInterval(interval);
  }, [user.id]);

  // Handle Initial Target User
  useEffect(() => {
      if (initialChatUserId && conversations.length > 0) {
          const target = conversations.find(c => c.id === initialChatUserId);
          if (target) {
              setActiveChatUser(target);
              if (onClearTargetUser) onClearTargetUser(); 
          } else {
              if (user.role === 'master') {
                  const fetchTarget = async () => {
                      const allUsers = await apiService.getAllUsers();
                      const found = allUsers.find(u => u.id === initialChatUserId);
                      if (found) {
                          const newConv: ConversationUser = {
                              id: found.id,
                              email: found.email,
                              role: found.role,
                              lastMessage: '',
                              lastMessageTime: Date.now(),
                              unreadCount: 0
                          };
                          setConversations(prev => [newConv, ...prev]);
                          setActiveChatUser(newConv);
                          if (onClearTargetUser) onClearTargetUser();
                      }
                  };
                  fetchTarget();
              }
          }
      }
  }, [initialChatUserId, conversations, user.role]);

  // Load messages
  useEffect(() => {
    if (activeChatUser) {
      loadMessages(activeChatUser.id);
      const interval = setInterval(() => loadMessages(activeChatUser.id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChatUser]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeChatUser, replyingTo]); // Scroll on reply change too to ensure view

  const loadConversations = async () => {
    try {
      const data = await apiService.getConversations(user.id);
      
      if (user.role === 'user') {
          const adminExists = data.find(c => c.role === 'master' || c.id === 'admin');
          if (!adminExists) {
              data.unshift({
                  id: 'admin',
                  email: 'admin@bibichat.io',
                  role: 'master',
                  lastMessage: 'Chào mừng bạn đến với cộng đồng!',
                  lastMessageTime: Date.now(),
                  unreadCount: 0
              });
          }
      }
      setConversations(data);
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  };

  const loadMessages = async (otherUserId: string) => {
      if (!messages.length) setIsLoadingMessages(true); 
      try {
          const msgs = await apiService.getDirectMessages(user.id, otherUserId);
          const linkedMsgs = msgs.map(m => {
              if (m.replyToId) {
                  const parent = msgs.find(p => p.id === m.replyToId);
                  if (parent) m.replyToContent = parent.type === 'sticker' ? '[Sticker]' : parent.content;
              }
              return m;
          });
          setMessages(linkedMsgs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingMessages(false);
      }
  };

  const handleSendMessage = async (content: string, type: 'text' | 'sticker' = 'text') => {
      if (!activeChatUser) return;

      const tempId = Date.now().toString();
      const replyId = replyingTo ? replyingTo.id : undefined;

      const tempMsg: DirectMessage = {
          id: tempId,
          senderId: user.id,
          receiverId: activeChatUser.id,
          content: content,
          timestamp: Date.now(),
          isRead: false,
          type: type,
          replyToId: replyId,
          replyToContent: replyingTo ? (replyingTo.type === 'sticker' ? '[Sticker]' : replyingTo.content) : undefined,
          reactions: []
      };
      
      setMessages(prev => [...prev, tempMsg]);
      setNewMessage('');
      setReplyingTo(null);
      setShowStickerPicker(false);
      setShowEmojiPicker(false);

      try {
          await apiService.sendDirectMessage(user.id, activeChatUser.id, content, type, replyId);
          loadConversations(); 
      } catch (e) {
          console.error("Failed to send", e);
          alert("Gửi tin nhắn thất bại");
      }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
      setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
              const currentReactions = m.reactions || [];
              const existingIndex = currentReactions.findIndex(r => r.userId === user.id);
              let newReactions = [...currentReactions];
              
              if (existingIndex > -1) {
                  if (currentReactions[existingIndex].emoji === emoji) {
                      newReactions.splice(existingIndex, 1);
                  } else {
                      newReactions[existingIndex].emoji = emoji;
                  }
              } else {
                  newReactions.push({ userId: user.id, emoji });
              }
              return { ...m, reactions: newReactions };
          }
          return m;
      }));

      try {
          await apiService.reactToMessage(messageId, user.id, emoji);
      } catch (e) {
          console.error("React failed", e);
      }
  };

  const handleAddUser = async () => {
      if (!searchEmail) return;
      setIsSearching(true);
      setSearchError('');
      
      try {
          if (searchEmail.toLowerCase() === user.email.toLowerCase()) {
              setSearchError("Bạn không thể chat với chính mình.");
              setIsSearching(false);
              return;
          }

          const result = await apiService.findUserByEmail(searchEmail);
          
          if (result.success && result.user) {
              const newUser = result.user;
              const existing = conversations.find(c => c.id === newUser.id);
              if (existing) {
                  setActiveChatUser(existing);
              } else {
                  const newConv: ConversationUser = {
                      id: newUser.id,
                      email: newUser.email,
                      role: newUser.role,
                      lastMessage: '',
                      lastMessageTime: Date.now(),
                      unreadCount: 0
                  };
                  setConversations(prev => [newConv, ...prev]);
                  setActiveChatUser(newConv);
              }
              setSearchEmail('');
          } else {
              setSearchError(result.message || 'Không tìm thấy người dùng.');
          }
      } catch (e) {
          setSearchError('Lỗi kết nối.');
      } finally {
          setIsSearching(false);
      }
  };

  // Helper function to handle back button on mobile
  const handleBackToConversations = () => {
      setActiveChatUser(null);
  };

  // Helper to handle reply click and focus
  const handleReplyClick = (msg: DirectMessage) => {
      setReplyingTo(msg);
      // Immediately focus the input
      if (inputRef.current) {
          inputRef.current.focus();
      }
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex gap-6 animate-in fade-in duration-500 pb-2 relative">
       {/* Sidebar List - Hidden on Mobile if Chat is Active */}
       <div className={`w-full md:w-80 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex-col shrink-0 ${activeChatUser ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
               <h3 className="font-black text-xl text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                   <i className="fa-solid fa-comments text-indigo-500"></i> Trò chuyện
               </h3>
               
               {/* Search User Input */}
               <div className="relative">
                   <input 
                      type="email" 
                      placeholder="Nhập email kết nối..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                   />
                   <button 
                      onClick={handleAddUser}
                      disabled={isSearching}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                   >
                       {isSearching ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-plus"></i>}
                   </button>
               </div>
               {searchError && <p className="text-xs text-rose-500 font-bold mt-2 ml-1">{searchError}</p>}
           </div>

           <div className="flex-1 overflow-y-auto p-3 space-y-2">
               {conversations.map(conv => (
                   <div 
                      key={conv.id}
                      onClick={() => setActiveChatUser(conv)}
                      className={`p-3 rounded-2xl cursor-pointer flex gap-3 items-center transition-all ${activeChatUser?.id === conv.id ? 'bg-indigo-50 dark:bg-slate-700 border-indigo-200 dark:border-slate-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent'} border-2 relative`}
                   >
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 relative ${conv.role === 'master' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-orange-400'}`}>
                           {conv.role === 'master' ? <i className="fa-solid fa-user-shield"></i> : conv.email.charAt(0).toUpperCase()}
                           {/* UNREAD BADGE */}
                           {conv.unreadCount !== undefined && conv.unreadCount > 0 && (
                               <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-bounce">
                                   {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                               </span>
                           )}
                       </div>
                       <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-baseline mb-0.5">
                               <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{conv.role === 'master' ? 'Admin Hỗ Trợ' : conv.email}</h4>
                               <span className="text-[10px] text-slate-400 font-bold">{conv.lastMessageTime && conv.lastMessageTime > 0 ? new Date(conv.lastMessageTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                           </div>
                           <p className={`text-xs truncate font-medium ${conv.unreadCount && conv.unreadCount > 0 ? 'text-slate-800 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'}`}>{conv.lastMessage || 'Chưa có tin nhắn'}</p>
                       </div>
                   </div>
               ))}
               {conversations.length === 0 && (
                   <div className="text-center py-10 opacity-50">
                       <i className="fa-solid fa-user-group text-3xl mb-2"></i>
                       <p className="text-xs font-bold">Chưa có cuộc trò chuyện nào</p>
                   </div>
               )}
           </div>
       </div>

       {/* Chat Area - Full screen on mobile if Active, else hidden on mobile */}
       <div className={`flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex-col relative ${activeChatUser ? 'flex fixed inset-0 z-50 md:static md:inset-auto md:z-0' : 'hidden md:flex'}`}>
           {activeChatUser ? (
               <>
                   {/* Chat Header */}
                   <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md z-10 shadow-sm">
                       {/* Back Button for Mobile */}
                       <button onClick={handleBackToConversations} className="md:hidden w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-500">
                           <i className="fa-solid fa-arrow-left"></i>
                       </button>

                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${activeChatUser.role === 'master' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-orange-400'}`}>
                           {activeChatUser.role === 'master' ? <i className="fa-solid fa-user-shield"></i> : activeChatUser.email.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <h3 className="font-bold text-slate-800 dark:text-white text-base">{activeChatUser.role === 'master' ? 'Admin Hỗ Trợ' : activeChatUser.email}</h3>
                           <p className="text-xs text-emerald-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online</p>
                       </div>
                   </div>

                   {/* Messages List */}
                   <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900" ref={scrollRef}>
                       {messages.map((msg) => {
                           const isMe = msg.senderId === user.id;
                           const hasReactions = msg.reactions && msg.reactions.length > 0;
                           
                           return (
                               <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'} ${hasReactions ? 'mb-5' : 'mb-1'}`}>
                                   <div className={`relative max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                       
                                       {/* Hover Toolbar (Reply & React) */}
                                       <div className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 z-20 animate-in fade-in zoom-in duration-200`}>
                                            <button onClick={() => handleReplyClick(msg)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="Trả lời">
                                                <i className="fa-solid fa-reply text-xs"></i>
                                            </button>
                                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-600 mx-1"></div>
                                            {REACTIONS.map(emoji => (
                                                <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition-transform hover:scale-125">
                                                    {emoji}
                                                </button>
                                            ))}
                                       </div>

                                       {/* Reply Context */}
                                       {msg.replyToId && (
                                           <div className={`text-[10px] text-slate-500 mb-1 px-2 flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                               <i className="fa-solid fa-reply fa-flip-vertical text-slate-400"></i> 
                                               <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-lg opacity-80 truncate max-w-[150px]">{msg.replyToContent || 'Tin nhắn đã xóa'}</span>
                                           </div>
                                       )}

                                       {/* Message Content */}
                                       {msg.type === 'sticker' ? (
                                           <img src={msg.content} alt="Sticker" className="w-32 h-32 object-contain hover:scale-105 transition-transform" />
                                       ) : (
                                           <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                                               {msg.content}
                                               
                                               {/* Timestamp & Status INSIDE Bubble */}
                                               <div className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                                                   {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                   {isMe && (
                                                       <i className={`fa-solid fa-check-double ${msg.isRead ? 'text-cyan-300' : 'text-indigo-300'}`}></i>
                                                   )}
                                               </div>
                                           </div>
                                       )}

                                       {/* Reactions Display - Floating Outside/Overlapping Bottom */}
                                       {hasReactions && (
                                           <div className={`absolute bottom-[-14px] ${isMe ? 'right-2' : 'left-2'} flex -space-x-1 z-10 filter drop-shadow-sm`}>
                                               {Array.from(new Set(msg.reactions!.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                                                   <div key={i} className="bg-white dark:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm border-[2px] border-slate-50 dark:border-slate-900">
                                                       {emoji}
                                                   </div>
                                               ))}
                                               <div className="bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 h-6 flex items-center justify-center text-[9px] font-bold text-slate-500 border-[2px] border-slate-50 dark:border-slate-900 shadow-sm min-w-[20px]">
                                                   {msg.reactions!.length}
                                               </div>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           );
                       })}
                       {messages.length === 0 && (
                           <div className="flex flex-col items-center justify-center h-full opacity-40">
                               <i className="fa-regular fa-paper-plane text-4xl mb-2"></i>
                               <p className="text-sm font-bold">Bắt đầu trò chuyện ngay đi nào!</p>
                           </div>
                       )}
                   </div>

                   {/* Input Area */}
                   <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 relative z-20">
                       
                       {/* Reply Banner - In Flow Design (Not Absolute anymore) */}
                       {replyingTo && (
                           <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center border-b border-slate-100 dark:border-slate-600 animate-in slide-in-from-bottom-2 fade-in duration-200">
                               <div className="flex items-center gap-3 truncate">
                                   <div className="w-1 h-8 bg-indigo-500 rounded-full shrink-0"></div>
                                   <div className="flex flex-col truncate">
                                       <span className="font-bold text-xs text-indigo-500 flex items-center gap-1">
                                           <i className="fa-solid fa-reply fa-flip-vertical"></i> Đang trả lời
                                       </span>
                                       <span className="text-xs text-slate-500 dark:text-slate-300 truncate max-w-[200px] font-medium">
                                           {replyingTo.type === 'sticker' ? 'Đã gửi một nhãn dán' : replyingTo.content}
                                       </span>
                                   </div>
                               </div>
                               <button 
                                   onClick={() => setReplyingTo(null)} 
                                   className="w-6 h-6 rounded-full bg-white dark:bg-slate-600 hover:bg-rose-50 dark:hover:bg-rose-900/50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-colors shadow-sm"
                               >
                                   <i className="fa-solid fa-xmark text-xs"></i>
                               </button>
                           </div>
                       )}

                       <div className="p-4 relative">
                           {/* Sticker Picker - Anchored to bottom left of input area */}
                           {showStickerPicker && (
                               <div ref={stickerPickerRef} className="absolute bottom-full left-4 mb-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 grid grid-cols-3 gap-2 w-72 h-64 overflow-y-auto z-30 animate-in zoom-in duration-200">
                                   {STICKERS.map((url, i) => (
                                       <img 
                                           key={i} 
                                           src={url} 
                                           alt="Sticker" 
                                           className="w-full h-auto rounded-lg cursor-pointer hover:scale-110 transition-transform bg-slate-50 dark:bg-slate-700/50"
                                           onClick={() => handleSendMessage(url, 'sticker')}
                                       />
                                   ))}
                               </div>
                           )}

                           {/* Emoji Picker - Anchored to bottom right of input area */}
                           {showEmojiPicker && (
                               <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 grid grid-cols-5 gap-2 w-64 z-30 animate-in zoom-in duration-200">
                                   {EMOJIS.map((emoji) => (
                                       <button 
                                           key={emoji} 
                                           onClick={() => setNewMessage(prev => prev + emoji)}
                                           className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
                                       >
                                           {emoji}
                                       </button>
                                   ))}
                               </div>
                           )}

                           <div className="flex gap-3 items-end">
                               <button 
                                   ref={stickerBtnRef}
                                   onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                                   className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showStickerPicker ? 'bg-pink-100 text-pink-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-pink-500'}`}
                               >
                                   <i className="fa-solid fa-note-sticky text-lg"></i>
                               </button>
                               
                               <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center pr-2 relative transition-all focus-within:ring-2 focus-within:ring-indigo-100">
                                   <input 
                                      ref={inputRef}
                                      type="text" 
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage, 'text')}
                                      placeholder="Nhập tin nhắn..." 
                                      className="flex-1 px-4 py-3 bg-transparent outline-none text-sm font-medium text-slate-800 dark:text-white"
                                   />
                                   <button 
                                       ref={emojiBtnRef}
                                       onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                                       className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                                   >
                                       <i className="fa-solid fa-face-smile text-lg"></i>
                                   </button>
                               </div>

                               <button 
                                  onClick={() => handleSendMessage(newMessage, 'text')} 
                                  disabled={!newMessage.trim()}
                                  className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                   <i className="fa-solid fa-paper-plane"></i>
                               </button>
                           </div>
                       </div>
                   </div>
               </>
           ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                   <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                       <i className="fa-solid fa-comments text-3xl"></i>
                   </div>
                   <h3 className="font-bold text-lg text-slate-600 dark:text-slate-400">Chọn người để chat</h3>
                   <p className="text-sm font-medium">Hoặc thêm mới bằng email bên trái nha.</p>
               </div>
           )}
       </div>
    </div>
  );
};

export default CommunityChat;
