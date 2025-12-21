
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { User, ConversationUser, DirectMessage } from '../types';

interface Props {
  user: User;
  initialChatUserId?: string | null;
  onClearTargetUser?: () => void;
}

const CommunityChat: React.FC<Props> = ({ user, initialChatUserId, onClearTargetUser }) => {
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load conversations list
  useEffect(() => {
    loadConversations();
    // Short polling for conversation updates (new messages from others)
    const interval = setInterval(loadConversations, 5000); 
    return () => clearInterval(interval);
  }, [user.id]);

  // Handle Initial Target User (e.g., coming from Customer Management)
  useEffect(() => {
      if (initialChatUserId && conversations.length > 0) {
          const target = conversations.find(c => c.id === initialChatUserId);
          if (target) {
              setActiveChatUser(target);
              if (onClearTargetUser) onClearTargetUser(); // Clear prop to avoid re-trigger
          } else {
              // If not found in list (never chatted before), try to fetch user details and add to list temporarily
              const fetchTarget = async () => {
                  // Hacky way: We don't have a direct getUserById public API easily accessible in this context without
                  // fetching all users. But let's assume if they are in Customer list, they exist.
                  // Ideally, getConversations should return them if we had a proper "create conversation" flow.
                  // For now, let's just wait for the user to be found or search manually if not found.
                  // Or better: Use findUserByEmail if we had the email. But we have ID.
                  // Let's iterate all users to find this ID (Master only feature essentially)
                  if (user.role === 'master') {
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
                  }
              };
              fetchTarget();
          }
      }
  }, [initialChatUserId, conversations, user.role]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatUser) {
      loadMessages(activeChatUser.id);
      // Short polling for messages in active chat
      const interval = setInterval(() => loadMessages(activeChatUser.id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChatUser]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await apiService.getConversations(user.id);
      
      // Automatic "Admin" contact for normal users if not exists
      if (user.role === 'user') {
          const adminExists = data.find(c => c.role === 'master' || c.id === 'admin');
          if (!adminExists) {
              // Add pseudo admin contact
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
      // Don't show loading on poll updates to prevent flicker, only on initial select
      if (!messages.length) setIsLoadingMessages(true); 
      try {
          const msgs = await apiService.getDirectMessages(user.id, otherUserId);
          setMessages(msgs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingMessages(false);
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMessage.trim() || !activeChatUser) return;

      const content = newMessage;
      setNewMessage(''); // Optimistic clear

      // Optimistic update
      const tempMsg: DirectMessage = {
          id: Date.now().toString(),
          senderId: user.id,
          receiverId: activeChatUser.id,
          content: content,
          timestamp: Date.now(),
          isRead: false
      };
      setMessages(prev => [...prev, tempMsg]);

      try {
          await apiService.sendDirectMessage(user.id, activeChatUser.id, content);
          loadConversations(); // Update list preview
      } catch (e) {
          console.error("Failed to send", e);
          alert("Gửi tin nhắn thất bại");
      }
  };

  const handleAddUser = async () => {
      if (!searchEmail) return;
      setIsSearching(true);
      setSearchError('');
      
      try {
          // Check if searching for self
          if (searchEmail.toLowerCase() === user.email.toLowerCase()) {
              setSearchError("Bạn không thể chat với chính mình.");
              setIsSearching(false);
              return;
          }

          const result = await apiService.findUserByEmail(searchEmail);
          
          if (result.success && result.user) {
              const newUser = result.user;
              // Check if already in list
              const existing = conversations.find(c => c.id === newUser.id);
              if (existing) {
                  setActiveChatUser(existing);
              } else {
                  // Create temp conversation item
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

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex gap-6 animate-in fade-in duration-500 pb-2">
       {/* Sidebar List */}
       <div className="w-full md:w-80 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col shrink-0">
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
                               <span className="text-[10px] text-slate-400 font-bold">{conv.lastMessageTime > 0 ? new Date(conv.lastMessageTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}</span>
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

       {/* Chat Area */}
       <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col relative">
           {activeChatUser ? (
               <>
                   {/* Chat Header */}
                   <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md z-10">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${activeChatUser.role === 'master' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-orange-400'}`}>
                           {activeChatUser.role === 'master' ? <i className="fa-solid fa-user-shield"></i> : activeChatUser.email.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <h3 className="font-bold text-slate-800 dark:text-white text-base">{activeChatUser.role === 'master' ? 'Admin Hỗ Trợ' : activeChatUser.email}</h3>
                           <p className="text-xs text-emerald-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online</p>
                       </div>
                   </div>

                   {/* Messages List */}
                   <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900" ref={scrollRef}>
                       {messages.map(msg => {
                           const isMe = msg.senderId === user.id;
                           return (
                               <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                   <div className={`max-w-[70%] px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                                       {msg.content}
                                       <div className={`text-[9px] font-bold mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                           {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                       </div>
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
                   <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                       <div className="flex gap-3">
                           <input 
                              type="text" 
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Nhập tin nhắn..." 
                              className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-sm font-medium text-slate-800 dark:text-white transition-all"
                           />
                           <button 
                              type="submit" 
                              disabled={!newMessage.trim()}
                              className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                               <i className="fa-solid fa-paper-plane"></i>
                           </button>
                       </div>
                   </form>
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
