
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// Threshold for "Online" status in milliseconds (e.g., 5 minutes)
const ONLINE_THRESHOLD = 5 * 60 * 1000;

// Separate Lightbox Component to manage hooks correctly
const ImageLightbox: React.FC<{
    src: string;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    current: number;
    total: number;
}> = ({ src, onClose, onPrev, onNext, hasPrev, hasNext, current, total }) => {
    // Touch state for swipe detection
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50; // Minimum distance to trigger swipe

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null); // Reset touch end
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && hasNext) {
            onNext();
        }
        if (isRightSwipe && hasPrev) {
            onPrev();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev) onPrev();
            if (e.key === 'ArrowRight' && hasNext) onNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasPrev, hasNext, onPrev, onNext, onClose]);

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 group touch-none"
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-50"
            >
                <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            {hasPrev && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 hidden md:flex items-center justify-center text-white transition-colors z-50 backdrop-blur-md opacity-0 group-hover:opacity-100 duration-300"
                >
                    <i className="fa-solid fa-chevron-left text-xl"></i>
                </button>
            )}
            
            <img 
                src={src} 
                alt="Expanded View" 
                className="max-w-full max-h-full rounded-xl shadow-2xl animate-in zoom-in duration-300 object-contain select-none"
                onClick={(e) => e.stopPropagation()} 
                draggable={false}
            />

            {hasNext && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 hidden md:flex items-center justify-center text-white transition-colors z-50 backdrop-blur-md opacity-0 group-hover:opacity-100 duration-300"
                >
                    <i className="fa-solid fa-chevron-right text-xl"></i>
                </button>
            )}

            {/* Image Counter & Mobile Hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 duration-300 transition-opacity">
                <div className="bg-black/50 px-4 py-1.5 rounded-full text-white text-xs font-bold backdrop-blur-md">
                    {current + 1} / {total}
                </div>
                <div className="md:hidden text-white/50 text-[10px] font-medium">
                    Vuốt để xem ảnh khác
                </div>
            </div>
        </div>,
        document.body
    );
};

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
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // New UI States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  
  // Image State
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null); // For Lightbox

  // Refs for Click Outside
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const stickerBtnRef = useRef<HTMLButtonElement>(null);

  // Helper to check online status
  const checkIsOnline = (lastActiveTime?: number, role?: string) => {
      // Admin/Master is always "Online" for support perception
      if (role === 'master') return true;
      if (!lastActiveTime) return false;
      return (Date.now() - lastActiveTime) < ONLINE_THRESHOLD;
  };

  // Helper to detect if a message is ONLY emojis (to remove background bubble)
  const isEmojiOnly = (text: string) => {
      if (!text) return false;
      const clean = text.replace(/\s/g, ''); // Remove whitespace
      if (!clean) return false;
      // Regex check: Contains Emoji-like characters AND NO alphanumeric characters
      const hasEmoji = /\p{Extended_Pictographic}/u.test(clean);
      const hasText = /[a-zA-Z0-9]/.test(clean);
      // Increased length limit to support multiple emojis (was 12)
      return hasEmoji && !hasText && clean.length < 200;
  };

  // Helper to estimate emoji size based on count
  const getEmojiSizeClass = (text: string) => {
      // Simple count approximation
      const length = Array.from(text).length;
      if (length <= 2) return 'text-6xl';
      if (length <= 6) return 'text-5xl';
      if (length <= 12) return 'text-4xl';
      return 'text-3xl';
  };

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
  }, [messages.length, activeChatUser, replyingTo, pendingImage]); // Scroll on reply change too to ensure view

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
                  lastMessageTime: Date.now(), // Admin always active
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
                  if (parent) m.replyToContent = parent.type === 'sticker' ? '[Sticker]' : (parent.type === 'image' ? '[Hình ảnh]' : parent.content);
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

  const handleSendMessage = async (content: string, type: 'text' | 'sticker' | 'image' = 'text') => {
      if (!activeChatUser) return;

      // Logic to handle both image and text sending
      // 1. Send Image first if pending
      if (pendingImage && !isUploading) {
          await executeSend(pendingImage, 'image');
          setPendingImage(null);
      }

      // 2. Send Text if content exists (and we didn't just pass the image content in)
      if (type === 'text' && content.trim()) {
          await executeSend(content, 'text');
      } else if (type === 'sticker') {
          await executeSend(content, 'sticker');
      }
  };

  const executeSend = async (msgContent: string, msgType: 'text' | 'sticker' | 'image') => {
      if (!activeChatUser) return;
      const tempId = Date.now().toString();
      const replyId = replyingTo ? replyingTo.id : undefined;

      const tempMsg: DirectMessage = {
          id: tempId,
          senderId: user.id,
          receiverId: activeChatUser.id,
          content: msgContent,
          timestamp: Date.now(),
          isRead: false,
          type: msgType,
          replyToId: replyId,
          replyToContent: replyingTo ? (replyingTo.type === 'sticker' ? '[Sticker]' : (replyingTo.type === 'image' ? '[Hình ảnh]' : replyingTo.content)) : undefined,
          reactions: []
      };
      
      setMessages(prev => [...prev, tempMsg]);
      setNewMessage('');
      setReplyingTo(null);
      setShowStickerPicker(false);
      setShowEmojiPicker(false);

      try {
          await apiService.sendDirectMessage(user.id, activeChatUser.id, msgContent, msgType, replyId);
          loadConversations(); 
      } catch (e) {
          console.error("Failed to send", e);
          alert("Gửi tin nhắn thất bại. Vui lòng thử lại.");
          // remove failed message from state if needed or show error icon
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

  const handleBackToConversations = () => {
      setActiveChatUser(null);
  };

  const handleReplyClick = (msg: DirectMessage) => {
      setReplyingTo(msg);
      if (inputRef.current) {
          inputRef.current.focus();
      }
  };

  // Centralized upload handler
  const handleFileUpload = async (file: File) => {
      if (!file) return;
      
      // Temporary local preview
      const localPreviewUrl = URL.createObjectURL(file);
      setPendingImage(localPreviewUrl);
      setIsUploading(true);

      try {
          const result = await apiService.uploadFile(file);
          setPendingImage(result.url); // Replace blob with real URL
      } catch (e) {
          console.error("Upload failed", e);
          alert("Tải ảnh thất bại. Vui lòng thử lại.");
          setPendingImage(null);
      } finally {
          setIsUploading(false);
      }
  };

  // Image Handling: Paste
  const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                  await handleFileUpload(blob);
              }
              e.preventDefault();
          }
      }
  };

  // Image Handling: File Select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          await handleFileUpload(e.target.files[0]);
      }
      // Reset input so same file can be selected again
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  // Prepare images for lightbox
  const images = messages.filter(m => m.type === 'image');
  const currentIndex = expandedImage ? images.findIndex(m => m.content === expandedImage) : -1;

  const handleNextImage = () => {
      if (currentIndex < images.length - 1) {
          setExpandedImage(images[currentIndex + 1].content);
      }
  };

  const handlePrevImage = () => {
      if (currentIndex > 0) {
          setExpandedImage(images[currentIndex - 1].content);
      }
  };

  // Safe zone for padding (Admin does not need right padding for Widget Button)
  // Logic: 
  // - Master: No extra padding (widget hidden).
  // - User Mobile: No extra padding (widget does not obstruct full screen view or keyboard area significantly, prioritize space).
  // - User Desktop: Large right padding (pr-28) to avoid overlap with fixed Widget button.
  const inputPadding = user.role === 'master' ? '' : 'md:pr-28';

  return (
    // Height adjusted for Mobile: h-[calc(100vh-14rem)] and min-h-[350px]
    // Desktop maintains previous height: md:h-[calc(100vh-10rem)] md:min-h-[500px]
    <>
    <div className="h-[calc(100vh-14rem)] md:h-[calc(100vh-10rem)] min-h-[350px] md:min-h-[500px] flex gap-6 animate-in fade-in duration-500 pb-2 relative">
        <style>{`
            .custom-scrollbar-hover {
                scrollbar-width: thin;
                scrollbar-color: transparent transparent;
            }
            .custom-scrollbar-hover:hover {
                scrollbar-color: #cbd5e1 transparent;
            }
            .dark .custom-scrollbar-hover:hover {
                scrollbar-color: #475569 transparent;
            }
            .custom-scrollbar-hover::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar-hover::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar-hover::-webkit-scrollbar-thumb {
                background-color: transparent;
                border-radius: 20px;
            }
            .custom-scrollbar-hover:hover::-webkit-scrollbar-thumb {
                background-color: #cbd5e1;
            }
            .dark .custom-scrollbar-hover:hover::-webkit-scrollbar-thumb {
                background-color: #475569;
            }
        `}</style>
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

           <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar-hover">
               {conversations.map(conv => {
                   const isOnline = checkIsOnline(conv.lastMessageTime, conv.role);
                   return (
                   <div 
                      key={conv.id}
                      onClick={() => setActiveChatUser(conv)}
                      className={`p-3 rounded-2xl cursor-pointer flex gap-3 items-center transition-all ${activeChatUser?.id === conv.id ? 'bg-indigo-50 dark:bg-slate-700 border-indigo-200 dark:border-slate-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent'} border-2 relative`}
                   >
                       <div className="relative shrink-0">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white relative ${conv.role === 'master' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-orange-400'}`}>
                               {conv.role === 'master' ? <i className="fa-solid fa-user-shield"></i> : conv.email.charAt(0).toUpperCase()}
                           </div>
                           {/* ONLINE INDICATOR */}
                           {isOnline && (
                               <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                           )}
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
                           {/* Updated Message Preview with Icon logic */}
                           <p className={`text-xs truncate font-medium ${conv.unreadCount && conv.unreadCount > 0 ? 'text-slate-800 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'}`}>
                               {(conv.lastMessage === '[Hình ảnh]' || conv.lastMessage === '[Sticker]') ? (
                                   <span className="flex items-center gap-1">
                                       <i className="fa-regular fa-image"></i> {conv.lastMessage === '[Sticker]' ? 'Sticker' : 'Hình ảnh'}
                                   </span>
                               ) : (
                                   conv.lastMessage || 'Chưa có tin nhắn'
                               )}
                           </p>
                       </div>
                   </div>
                   );
               })}
               {conversations.length === 0 && (
                   <div className="text-center py-10 opacity-50">
                       <i className="fa-solid fa-user-group text-3xl mb-2"></i>
                       <p className="text-xs font-bold">Chưa có cuộc trò chuyện nào</p>
                   </div>
               )}
           </div>
       </div>

       {/* Chat Area */}
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
                           
                           {/* Dynamic Status Text */}
                           {checkIsOnline(activeChatUser.lastMessageTime, activeChatUser.role) ? (
                               <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang hoạt động
                               </p>
                           ) : (
                               <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                   <i className="fa-regular fa-clock text-[10px]"></i> 
                                   {activeChatUser.lastMessageTime 
                                     ? `Truy cập lúc ${new Date(activeChatUser.lastMessageTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}`
                                     : 'Ngoại tuyến'
                                   }
                               </p>
                           )}
                       </div>
                   </div>

                   {/* Messages List */}
                   <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900" ref={scrollRef}>
                       {messages.map((msg) => {
                           const isMe = msg.senderId === user.id;
                           const hasReactions = msg.reactions && msg.reactions.length > 0;
                           const isEmoji = msg.type === 'text' && isEmojiOnly(msg.content);
                           const emojiSizeClass = isEmoji ? getEmojiSizeClass(msg.content) : '';
                           
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
                                           <div className="relative inline-block group">
                                                <img src={msg.content} alt="Sticker" className="w-32 h-32 object-contain hover:scale-105 transition-transform" />
                                                {/* Timestamp & Status Overlay for Sticker */}
                                                <div className={`absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                    {isMe && (
                                                        <div title={msg.isRead ? "Đã xem" : "Đã gửi"}>
                                                            {msg.isRead ? (
                                                                <i className="fa-solid fa-check-double text-cyan-300"></i>
                                                            ) : (
                                                                <i className="fa-solid fa-check text-slate-300"></i>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                           </div>
                                       ) : msg.type === 'image' ? (
                                            <div className="relative inline-block group cursor-pointer" onClick={() => setExpandedImage(msg.content)}>
                                                <img src={msg.content} alt="Image" className="w-64 h-auto rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity" />
                                                <div className={`absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                    {isMe && (
                                                        <div title={msg.isRead ? "Đã xem" : "Đã gửi"}>
                                                            {msg.isRead ? (
                                                                <i className="fa-solid fa-check-double text-cyan-300"></i>
                                                            ) : (
                                                                <i className="fa-solid fa-check text-slate-300"></i>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                       ) : isEmoji ? (
                                           <div className={`relative inline-block group px-2 ${isMe ? 'text-right' : 'text-left'}`}>
                                                <span className={`${emojiSizeClass} leading-tight drop-shadow-sm hover:scale-110 transition-transform cursor-default inline-block break-words whitespace-pre-wrap max-w-full`}>{msg.content}</span>
                                                {/* Timestamp & Status Overlay for Emoji (Pill style on hover) */}
                                                <div className={`absolute -bottom-6 ${isMe ? 'right-0' : 'left-0'} bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                    {isMe && (
                                                        <div title={msg.isRead ? "Đã xem" : "Đã gửi"}>
                                                            {msg.isRead ? (
                                                                <i className="fa-solid fa-check-double text-cyan-300"></i>
                                                            ) : (
                                                                <i className="fa-solid fa-check text-slate-300"></i>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                           </div>
                                       ) : (
                                           <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                                               {msg.content}
                                               
                                               {/* Timestamp & Status INSIDE Bubble */}
                                               <div className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                                                   {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                   {isMe && (
                                                       <div title={msg.isRead ? "Đã xem" : "Đã gửi"}>
                                                            {msg.isRead ? (
                                                                <i className="fa-solid fa-check-double text-cyan-300"></i>
                                                            ) : (
                                                                <i className="fa-solid fa-check text-indigo-300/70"></i>
                                                            )}
                                                       </div>
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
                       
                       {/* Reply Banner */}
                       {replyingTo && (
                           <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center border-b border-slate-100 dark:border-slate-600 animate-in slide-in-from-bottom-2 fade-in duration-200">
                               <div className="flex items-center gap-3 truncate">
                                   <div className="w-1 h-8 bg-indigo-500 rounded-full shrink-0"></div>
                                   <div className="flex flex-col truncate">
                                       <span className="font-bold text-xs text-indigo-500 flex items-center gap-1">
                                           <i className="fa-solid fa-reply fa-flip-vertical"></i> Đang trả lời
                                       </span>
                                       <span className="text-xs text-slate-500 dark:text-slate-300 truncate max-w-[200px] font-medium">
                                           {replyingTo.type === 'sticker' ? 'Đã gửi một nhãn dán' : (replyingTo.type === 'image' ? 'Đã gửi một hình ảnh' : replyingTo.content)}
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

                       {/* Image Preview Banner */}
                       {pendingImage && (
                           <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center border-b border-slate-100 dark:border-slate-600 animate-in slide-in-from-bottom-2 fade-in duration-200">
                               <div className="flex items-center gap-3">
                                   <div className="relative">
                                      <img src={pendingImage} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm" />
                                      {isUploading && (
                                          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                              <i className="fa-solid fa-circle-notch animate-spin text-white text-xs"></i>
                                          </div>
                                      )}
                                   </div>
                                   <div className="flex flex-col">
                                       <span className="font-bold text-xs text-indigo-500 flex items-center gap-1">
                                           <i className="fa-solid fa-image"></i> Ảnh đã chọn
                                       </span>
                                       <span className="text-[10px] text-slate-400 font-bold">{isUploading ? 'Đang tải lên server...' : 'Sẵn sàng gửi'}</span>
                                   </div>
                               </div>
                               <button 
                                   onClick={() => setPendingImage(null)} 
                                   className="w-6 h-6 rounded-full bg-white dark:bg-slate-600 hover:bg-rose-50 dark:hover:bg-rose-900/50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-colors shadow-sm"
                                   disabled={isUploading}
                               >
                                   <i className="fa-solid fa-xmark text-xs"></i>
                               </button>
                           </div>
                       )}

                       {/* Updated Layout for Mobile and Admin Padding */}
                       <div className={`p-3 md:p-4 relative ${inputPadding}`}>
                           {/* Sticker Picker */}
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

                           {/* Emoji Picker */}
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

                           <div className="flex gap-2 md:gap-3 items-end">
                               <button 
                                   ref={stickerBtnRef}
                                   onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                                   className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${showStickerPicker ? 'bg-pink-100 text-pink-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-pink-500'}`}
                                   title="Gửi Sticker"
                               >
                                   <i className="fa-solid fa-note-sticky text-lg"></i>
                               </button>

                               {/* Image Button & Hidden Input */}
                               <input 
                                   type="file" 
                                   ref={fileInputRef} 
                                   className="hidden" 
                                   accept="image/*" 
                                   onChange={handleFileSelect} 
                               />
                               <button 
                                   onClick={() => fileInputRef.current?.click()}
                                   className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-emerald-500"
                                   title="Gửi ảnh"
                               >
                                   <i className="fa-solid fa-image text-lg"></i>
                               </button>
                               
                               <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center pr-2 relative transition-all focus-within:ring-2 focus-within:ring-indigo-100 min-w-0">
                                   <input 
                                      ref={inputRef}
                                      type="text" 
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage, 'text')}
                                      onPaste={handlePaste}
                                      placeholder="Nhập tin nhắn..." 
                                      className="flex-1 px-3 py-3 md:px-4 md:py-3 bg-transparent outline-none text-sm font-medium text-slate-800 dark:text-white min-w-0"
                                   />
                                   <button 
                                       ref={emojiBtnRef}
                                       onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                                       className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                                   >
                                       <i className="fa-solid fa-face-smile text-lg"></i>
                                   </button>
                               </div>

                               <button 
                                  onClick={() => handleSendMessage(newMessage, 'text')} 
                                  disabled={(!newMessage.trim() && !pendingImage) || isUploading}
                                  className="shrink-0 w-12 h-10 md:w-14 md:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                   {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
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

    {expandedImage && (
        <ImageLightbox 
            src={expandedImage}
            onClose={() => setExpandedImage(null)}
            onPrev={handlePrevImage}
            onNext={handleNextImage}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < images.length - 1}
            current={currentIndex}
            total={images.length}
        />
    )}
    </>
  );
};

export default CommunityChat;
