
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/apiService';
import { socketService } from '../services/socketService';
import { User, ConversationUser, DirectMessage, Reaction } from '../types';

interface Props {
  user: User;
  initialChatUserId?: string | null;
  onClearTargetUser?: () => void;
}

// Danh sách Sticker
const STICKERS = [
    "https://media.giphy.com/media/MDJ9IbxxvDuQA/giphy.gif",
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    "https://media.giphy.com/media/vTKfa32Y2X5Ic/giphy.gif",
    "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif",
    "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
    "https://media.giphy.com/media/C9x8gXo5CnGtO/giphy.gif",
    "https://media.giphy.com/media/3o7TKmHNHOvHCryVjf/giphy.gif",
    "https://media.giphy.com/media/l4KibWpBGWchSqCRy/giphy.gif",
    "https://media.giphy.com/media/3o7TKDkDbIDJieo1sk/giphy.gif",
    "https://media.giphy.com/media/10t57cXgo7x5kI/giphy.gif",
    "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
    "https://media.giphy.com/media/l0HlHFRbmaZtVBhXYd/giphy.gif",
    "https://media.giphy.com/media/QvBoMEcTKDCRjHzwM7/giphy.gif",
    "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif",
    "https://media.giphy.com/media/26AHvcW0LB97W8dfi/giphy.gif",
];

const EMOJIS = ['😀', '😂', '😍', '😎', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '👀', '✨', '💯', '🤔', '😅', '🤮', '😴', '🥳', '👻'];
const REACTIONS = ['❤️', '😆', '😮', '😢', '😡', '👍'];
const ONLINE_THRESHOLD = 5 * 60 * 1000;

// === UTILS ===

const compressImage = async (file: File): Promise<File> => {
    if (file.type === 'image/gif') return file;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Giảm kích thước tối đa xuống 1280px để đảm bảo file nhẹ
                const maxWidth = 1280; 
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Giảm chất lượng xuống 0.4 -> Xấp xỉ 80kb - 150kb
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    } else reject(new Error('Compression failed'));
                }, 'image/jpeg', 0.4); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// === COMPONENTS ===

// SafeImage với cơ chế Retry thông minh và Callback khi load xong
const SafeImage: React.FC<{ src: string; alt: string; className?: string; onClick?: () => void; onImageLoaded?: () => void }> = ({ src, alt, className, onClick, onImageLoaded }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [retryCount, setRetryCount] = useState(0);
    
    // Reset khi src thay đổi
    useEffect(() => { 
        setStatus('loading'); 
        setRetryCount(0);
    }, [src]);

    const handleError = () => {
        // Nếu lỗi, thử lại tối đa 3 lần, mỗi lần cách nhau 1.5s
        if (retryCount < 3) {
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                // Giữ trạng thái loading để không hiện lỗi
                setStatus('loading');
            }, 1500 + (retryCount * 1000));
        } else {
            setStatus('error');
        }
    };

    const handleLoad = () => {
        setStatus('loaded');
        if (onImageLoaded) onImageLoaded();
    };

    // Thêm timestamp vào src để force reload nếu đang retry
    const displaySrc = retryCount > 0 ? `${src}?retry=${retryCount}` : src;

    return (
        <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
            {status === 'loading' && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center z-10 w-full h-full">
                    <i className="fa-solid fa-image text-slate-400 text-2xl animate-bounce"></i>
                </div>
            )}
            {status === 'error' && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-700 p-2 z-20 w-full h-full">
                    <i className="fa-solid fa-ghost mb-1"></i>
                    <span className="text-[9px] font-bold uppercase">Lỗi ảnh</span>
                </div>
            )}
            <img 
                src={displaySrc} 
                alt={alt} 
                loading="lazy"
                decoding="async"
                className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`} 
                onLoad={handleLoad} 
                onError={handleError} 
                draggable={false}
            />
        </div>
    );
};

// Lightbox đã fix nháy đen và bỏ hiệu ứng ánh sáng gây khó chịu
const ImageLightbox: React.FC<{ images: string[]; initialIndex: number; onClose: () => void; }> = ({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length > 1) return;
        setIsDragging(true);
        setIsAnimating(false);
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !touchStart.current) return;
        const dx = e.touches[0].clientX - touchStart.current.x;
        const dy = e.touches[0].clientY - touchStart.current.y;
        
        if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 10) setOffset({ x: 0, y: dy });
        else if (Math.abs(offset.y) < 10) setOffset({ x: dx, y: 0 });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setIsAnimating(true);
        if (!touchStart.current) return;
        const { x, y } = offset;
        
        if (Math.abs(y) > 150) { onClose(); return; }
        
        if (Math.abs(x) > viewportWidth * 0.25 && y === 0) {
            if (x < 0 && currentIndex < images.length - 1) {
                setOffset({ x: -viewportWidth - 20, y: 0 });
                setTimeout(() => { setIsAnimating(false); setCurrentIndex(c => c + 1); setOffset({x:0, y:0})}, 300);
                return;
            } else if (x > 0 && currentIndex > 0) {
                setOffset({ x: viewportWidth + 20, y: 0 });
                setTimeout(() => { setIsAnimating(false); setCurrentIndex(c => c - 1); setOffset({x:0, y:0})}, 300);
                return;
            }
        }
        setOffset({ x: 0, y: 0 });
        touchStart.current = null;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                setIsAnimating(true);
                setOffset({ x: viewportWidth, y: 0 });
                setTimeout(() => { setIsAnimating(false); setCurrentIndex(c => c - 1); setOffset({x:0, y:0})}, 300);
            }
            if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
                setIsAnimating(true);
                setOffset({ x: -viewportWidth, y: 0 });
                setTimeout(() => { setIsAnimating(false); setCurrentIndex(c => c + 1); setOffset({x:0, y:0})}, 300);
            }
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, images.length, viewportWidth]);

    const bgOpacity = Math.max(0, 1 - Math.abs(offset.y) / (window.innerHeight * 0.7));
    const scale = offset.y !== 0 ? Math.max(0.7, 1 - Math.abs(offset.y) / 1000) : 1;
    const transition = isAnimating ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    const GAP = 40; 

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center touch-none overflow-hidden"
            style={{ 
                backgroundColor: `rgba(0, 0, 0, ${offset.x !== 0 ? 0.95 : bgOpacity * 0.95})`, 
                transition: isDragging ? 'none' : 'background-color 0.3s' 
            }}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={onClose}
        >
            <button onClick={onClose} className="absolute top-6 right-6 z-50 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md"><i className="fa-solid fa-xmark"></i></button>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 text-white font-bold text-xs bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">{currentIndex + 1} / {images.length}</div>
            
            {currentIndex > 0 && <button onClick={(e) => { e.stopPropagation(); setIsAnimating(true); setOffset({ x: viewportWidth, y: 0 }); setTimeout(() => { setIsAnimating(false); setCurrentIndex(c => c - 1); setOffset({x:0, y:0})}, 300); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white z-50 backdrop-blur-md"><i className="fa-solid fa-chevron-left"></i></button>}
            {currentIndex < images.length - 1 && <button onClick={(e) => { e.stopPropagation(); setIsAnimating(true); setOffset({ x: -viewportWidth, y: 0 }); setTimeout(() => { setIsAnimating(false); setCurrentIndex(c => c + 1); setOffset({x:0, y:0})}, 300); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white z-50 backdrop-blur-md"><i className="fa-solid fa-chevron-right"></i></button>}

            <div className="relative w-full h-full" onClick={e => e.stopPropagation()}>
                {/* Previous Image */}
                {currentIndex > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translateX(${offset.x - viewportWidth - GAP}px) scale(${scale})`, transition }}>
                        <img src={images[currentIndex - 1]} className="max-w-full max-h-full object-contain" alt="Prev" draggable={false} decoding="async" />
                    </div>
                )}

                {/* Current Image */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transition }}>
                    <img src={images[currentIndex]} className="max-w-full max-h-full object-contain shadow-2xl select-none" draggable={false} alt="Current" decoding="async" />
                </div>

                {/* Next Image */}
                {currentIndex < images.length - 1 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translateX(${offset.x + viewportWidth + GAP}px) scale(${scale})`, transition }}>
                        <img src={images[currentIndex + 1]} className="max-w-full max-h-full object-contain" alt="Next" draggable={false} decoding="async" />
                    </div>
                )}
            </div>
        </div>, document.body
    );
};

// === MAIN COMPONENT ===

type PendingImage = {
    id: string;
    localUrl: string;
    serverUrl?: string;
    uploading: boolean;
    error?: boolean;
    file: File;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  
  // State for Uploads
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadQueueRunning, setUploadQueueRunning] = useState(false);
  
  const [lightboxData, setLightboxData] = useState<{ images: string[], index: number } | null>(null);

  // --- HELPER FUNCTIONS ---
  
  // Update URL param when active chat changes
  const updateChatUrl = (userId: string | null) => {
      const url = new URL(window.location.href);
      if (userId) {
          url.searchParams.set('chatUser', userId);
      } else {
          url.searchParams.delete('chatUser');
      }
      window.history.replaceState({}, '', url.toString());
  };

  const handleSelectConversation = (conv: ConversationUser) => {
      setActiveChatUser(conv);
      updateChatUrl(conv.id);
  };

  const loadConversations = async () => {
      try {
          const convs = await apiService.getConversations(user.id);
          setConversations(convs);
          return convs;
      } catch (error) {
          console.error("Failed to load conversations", error);
          return [];
      }
  };

  const loadMessages = async (targetUserId: string) => {
      try {
          const msgs = await apiService.getDirectMessages(user.id, targetUserId);
          setMessages(msgs);
      } catch (error) {
          console.error("Failed to load messages", error);
      }
  };

  const handleAddUser = async () => {
      if (!searchEmail) return;
      setIsSearching(true);
      setSearchError('');
      const res = await apiService.findUserByEmail(searchEmail);
      setIsSearching(false);
      
      if (res.success && res.user) {
          const exists = conversations.find(c => c.id === res.user!.id);
          if (exists) {
              handleSelectConversation(exists);
          } else {
              const newConv: ConversationUser = {
                  id: res.user!.id,
                  email: res.user!.email,
                  role: res.user!.role,
                  unreadCount: 0
              };
              setConversations(prev => [newConv, ...prev]);
              handleSelectConversation(newConv);
          }
          setSearchEmail('');
      } else {
          setSearchError(res.message || 'Không tìm thấy.');
      }
  };

  const checkIsOnline = (lastTime?: number, role?: string) => {
      if (!lastTime) return false;
      return (Date.now() - lastTime) < ONLINE_THRESHOLD;
  };

  const handleBackToConversations = () => {
      setActiveChatUser(null);
      updateChatUrl(null);
  };

  const openLightbox = (images: string[], index: number) => {
      setLightboxData({ images, index });
  };

  const isEmojiOnly = (text: string) => {
      if (!text) return false;
      const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u;
      return emojiRegex.test(text) && text.length < 10;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                  const newImg: PendingImage = {
                      id: Math.random().toString(36).substr(2, 9) + Date.now(),
                      localUrl: URL.createObjectURL(file),
                      uploading: true,
                      file: file
                  };
                  setPendingImages(prev => [...prev, newImg]);
              }
          }
      }
  };

  const isUploading = pendingImages.some(img => img.uploading);

  // --- UPLOAD LOGIC (SEQUENTIAL 1-BY-1) ---
  
  useEffect(() => {
      if (!uploadQueueRunning) {
          const nextImageToUpload = pendingImages.find(img => img.uploading && !img.serverUrl && !img.error);
          if (nextImageToUpload) {
              processSingleImage(nextImageToUpload);
          }
      }
  }, [pendingImages, uploadQueueRunning]);

  const processSingleImage = async (img: PendingImage) => {
      setUploadQueueRunning(true);
      try {
          const compressed = await compressImage(img.file);
          const result = await apiService.uploadFile(compressed);
          
          setPendingImages(prev => prev.map(p => 
              p.id === img.id ? { ...p, serverUrl: result.url, uploading: false } : p
          ));
      } catch (e) {
          console.error("Upload failed", e);
          setPendingImages(prev => prev.map(p => 
              p.id === img.id ? { ...p, uploading: false, error: true } : p
          ));
      } finally {
          setUploadQueueRunning(false);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          const newImages: PendingImage[] = files.map(file => ({
              id: Math.random().toString(36).substr(2, 9) + Date.now(),
              localUrl: URL.createObjectURL(file),
              uploading: true,
              file: file
          }));
          setPendingImages(prev => [...prev, ...newImages]);
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingImage = (id: string) => {
      setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  // --- SEND LOGIC ---
  const handleSendMessage = async (content: string, type: 'text' | 'sticker' | 'image' = 'text') => {
      if (!activeChatUser) return;

      if (type === 'text' && content.trim()) await executeSend(content, 'text');
      else if (type === 'sticker') await executeSend(content, 'sticker');

      // Gửi ảnh đã upload
      const readyImages = pendingImages.filter(img => !img.uploading && img.serverUrl);
      
      if (readyImages.length > 0) {
          // XÓA NGAY LẬP TỨC pendingImages khỏi UI để ẩn thanh cuộn ngang
          const idsToSend = new Set(readyImages.map(i => i.id));
          setPendingImages(prev => prev.filter(img => !idsToSend.has(img.id)));

          const batchGroupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          for (const img of readyImages) {
              if (img.serverUrl) {
                  await apiService.sendDirectMessage(user.id, activeChatUser.id, img.serverUrl, 'image', undefined, batchGroupId);
              }
          }
      }
  };

  const executeSend = async (msgContent: string, msgType: 'text' | 'sticker' | 'image', replyId?: string, groupId?: string) => {
      if (!activeChatUser) return;
      
      if (msgType !== 'image') {
          const tempId = Date.now().toString() + Math.random().toString();
          const actualReplyId = replyId || (replyingTo ? replyingTo.id : undefined);

          const tempMsg: DirectMessage = {
              id: tempId,
              senderId: user.id,
              receiverId: activeChatUser.id,
              content: msgContent,
              timestamp: Date.now(),
              isRead: false,
              type: msgType,
              replyToId: actualReplyId,
              replyToContent: replyingTo ? (replyingTo.type === 'sticker' ? '[Sticker]' : (replyingTo.type === 'image' ? '[Hình ảnh]' : replyingTo.content)) : undefined,
              reactions: [],
              groupId: groupId
          };
          
          setMessages(prev => [...prev, tempMsg]);
      }
      
      setNewMessage('');
      setReplyingTo(null);
      setShowStickerPicker(false);
      setShowEmojiPicker(false);

      try {
          const actualReplyId = replyId || (replyingTo ? replyingTo.id : undefined);
          await apiService.sendDirectMessage(user.id, activeChatUser.id, msgContent, msgType, actualReplyId, groupId);
      } catch (e) {
          console.error("Failed to send", e);
      }
  };

  // --- GROUPING LOGIC (STRICT GROUP ID) ---
  const groupedMessages = useMemo(() => {
      const groups: Array<DirectMessage | { type: 'image-group', id: string, senderId: string, timestamp: number, msgs: DirectMessage[] }> = [];
      let currentGroup: DirectMessage[] = [];

      for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          
          if (msg.type === 'image' && msg.groupId) {
              if (currentGroup.length === 0) {
                  currentGroup.push(msg);
              } else {
                  if (currentGroup[0].groupId === msg.groupId) {
                      currentGroup.push(msg);
                  } else {
                      groups.push({
                          type: 'image-group',
                          id: currentGroup[0].id,
                          senderId: currentGroup[0].senderId,
                          timestamp: currentGroup[currentGroup.length-1].timestamp,
                          msgs: [...currentGroup]
                      });
                      currentGroup = [msg];
                  }
              }
          } else {
              if (currentGroup.length > 0) {
                  groups.push({
                      type: 'image-group',
                      id: currentGroup[0].id,
                      senderId: currentGroup[0].senderId,
                      timestamp: currentGroup[currentGroup.length-1].timestamp,
                      msgs: [...currentGroup]
                  });
                  currentGroup = [];
              }
              groups.push(msg);
          }
      }
      if (currentGroup.length > 0) {
          groups.push({
              type: 'image-group',
              id: currentGroup[0].id,
              senderId: currentGroup[0].senderId,
              timestamp: currentGroup[currentGroup.length-1].timestamp,
              msgs: [...currentGroup]
                  });
      }
      return groups;
  }, [messages]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    loadConversations();
    
    socketService.on('direct_message', (msg: DirectMessage) => {
        if (activeChatUser && msg.senderId === activeChatUser.id) setMessages(prev => [...prev, msg]);
        loadConversations();
    });
    
    socketService.on('message_sent', (msg: DirectMessage) => {
         if (activeChatUser && msg.receiverId === activeChatUser.id) {
             setMessages(prev => {
                 if(prev.find(m => m.id === msg.id)) return prev;
                 if (msg.type === 'image') return [...prev, msg];
                 
                 const isDuplicateText = prev.some(m => 
                     m.content === msg.content && 
                     m.type === msg.type && 
                     Math.abs(m.timestamp - msg.timestamp) < 2000
                 );
                 if(isDuplicateText) return prev;

                 return [...prev, msg];
             });
         }
         loadConversations();
    });

    socketService.on('message_reaction', (data: { messageId: string, reactions: any[] }) => {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
    });
    return () => {
        socketService.off('direct_message');
        socketService.off('message_sent');
        socketService.off('message_reaction');
    }
  }, [activeChatUser?.id]);

  useEffect(() => {
      if (initialChatUserId && conversations.length > 0) {
          const target = conversations.find(c => c.id === initialChatUserId);
          if (target) {
              setActiveChatUser(target);
              updateChatUrl(target.id);
              if (onClearTargetUser) onClearTargetUser(); 
          }
      }
  }, [initialChatUserId, conversations]);

  useEffect(() => {
    if (activeChatUser) loadMessages(activeChatUser.id);
  }, [activeChatUser]);

  // Scroll to bottom on updates with slight delay to ensure rendering
  const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
  };

  useEffect(() => {
    // Immediate scroll
    scrollToBottom();
    // Delayed scroll for safety
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length, activeChatUser, replyingTo, pendingImages.length]);

  // Handle auto-scroll when image loads
  const handleImageLoad = () => {
      if (scrollRef.current) {
          const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
          // Nếu người dùng đang ở gần cuối (khoảng 800px) thì tự động cuộn xuống tiếp khi ảnh bung ra
          // Hoặc nếu tin nhắn ít (mới mở chat) cũng cuộn
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          if (distanceFromBottom < 800 || scrollHeight < 1500) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
      }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
      setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
              const currentReactions = m.reactions || [];
              const existingIndex = currentReactions.findIndex(r => r.userId === user.id);
              let newReactions = [...currentReactions];
              if (existingIndex > -1) {
                  if (currentReactions[existingIndex].emoji === emoji) newReactions.splice(existingIndex, 1);
                  else newReactions[existingIndex].emoji = emoji;
              } else newReactions.push({ userId: user.id, emoji });
              return { ...m, reactions: newReactions };
          }
          return m;
      }));
      try { await apiService.reactToMessage(messageId, user.id, emoji); } catch (e) {}
  };

  const handleReplyClick = (msg: DirectMessage) => {
      setReplyingTo(msg);
      if (inputRef.current) inputRef.current.focus();
  };

  return (
    <>
    <div className="h-[calc(100vh-16rem)] md:h-[calc(100vh-10rem)] min-h-[300px] md:min-h-[500px] flex gap-6 animate-in fade-in duration-500 pb-2 relative">
       {/* Sidebar (Conversations) */}
       <div className={`w-full md:w-80 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex-col shrink-0 ${activeChatUser ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
               <h3 className="font-black text-xl text-slate-800 dark:text-white mb-4 flex items-center gap-2"><i className="fa-solid fa-comments text-indigo-500"></i> Chat hỗ trợ</h3>
               <div className="relative">
                   <input type="email" placeholder="Nhập email kết nối..." value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddUser()} className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" />
                   <button onClick={handleAddUser} disabled={isSearching} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">{isSearching ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-plus"></i>}</button>
               </div>
               {searchError && <p className="text-xs text-rose-500 font-bold mt-2 ml-1">{searchError}</p>}
           </div>
           <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar-hover">
               {conversations.map(conv => (
                   <div key={conv.id} onClick={() => handleSelectConversation(conv)} className={`p-3 rounded-2xl cursor-pointer flex gap-3 items-center transition-all ${activeChatUser?.id === conv.id ? 'bg-indigo-50 dark:bg-slate-700 border-indigo-200 dark:border-slate-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent'} border-2 relative`}>
                       <div className="relative shrink-0">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white relative ${conv.role === 'master' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-orange-400'}`}>
                               {conv.role === 'master' ? <i className="fa-solid fa-user-shield"></i> : conv.email.charAt(0).toUpperCase()}
                           </div>
                           {checkIsOnline(conv.lastMessageTime, conv.role) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>}
                           {conv.unreadCount !== undefined && conv.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-bounce">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>}
                       </div>
                       <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-baseline mb-0.5">
                               <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{conv.role === 'master' ? 'Admin Hỗ Trợ' : conv.email}</h4>
                               <span className="text-[10px] text-slate-400 font-bold">{conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                           </div>
                           <p className={`text-xs truncate font-medium ${conv.unreadCount ? 'text-slate-800 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'}`}>{conv.lastMessage || 'Chưa có tin nhắn'}</p>
                       </div>
                   </div>
               ))}
           </div>
       </div>

       {/* Chat Main Area */}
       <div className={`flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex-col relative ${activeChatUser ? 'flex fixed inset-0 z-50 md:static md:inset-auto md:z-0' : 'hidden md:flex'}`}>
           {activeChatUser ? (
               <>
                   {/* Header */}
                   <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md z-10 shadow-sm">
                       <button onClick={handleBackToConversations} className="md:hidden w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-500"><i className="fa-solid fa-arrow-left"></i></button>
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${activeChatUser.role === 'master' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-orange-400'}`}>
                           {activeChatUser.role === 'master' ? <i className="fa-solid fa-user-shield"></i> : activeChatUser.email.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <h3 className="font-bold text-slate-800 dark:text-white text-base">{activeChatUser.role === 'master' ? 'Admin Hỗ Trợ' : activeChatUser.email}</h3>
                           {checkIsOnline(activeChatUser.lastMessageTime, activeChatUser.role) ? <p className="text-xs text-emerald-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang hoạt động</p> : <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><i className="fa-regular fa-clock text-[10px]"></i> Ngoại tuyến</p>}
                       </div>
                   </div>

                   {/* Messages */}
                   <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900" ref={scrollRef}>
                       {groupedMessages.map((item) => {
                           const isGroup = 'type' in item && item.type === 'image-group';
                           const msg = isGroup ? (item as any).msgs[0] : item as DirectMessage;
                           const isMe = msg.senderId === user.id;
                           
                           if (isGroup) {
                               const group = item as { id: string; msgs: DirectMessage[]; timestamp: number };
                               const images = group.msgs;
                               const count = images.length;
                               const groupImageUrls = images.map(img => img.content);
                               
                               return (
                                   <div key={group.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                                       <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                           {/* Updated Grid for Mobile */}
                                           <div className={`grid gap-1 overflow-hidden rounded-2xl w-full max-w-[16rem] ${count === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                               {images.slice(0, 4).map((img, idx) => {
                                                   const isOverlay = count > 4 && idx === 3;
                                                   let spanClass = '';
                                                   if (count === 3 && idx === 0) spanClass = 'col-span-2 aspect-[2/1]';
                                                   else spanClass = 'aspect-square';

                                                   return (
                                                       <div key={img.id} className={`relative cursor-pointer group/img overflow-hidden ${spanClass}`} onClick={() => openLightbox(groupImageUrls, idx)}>
                                                           <SafeImage onImageLoaded={handleImageLoad} src={img.content} alt="img" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                                           {isOverlay && (
                                                               <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px] pointer-events-none">
                                                                   +{count - 3}
                                                               </div>
                                                           )}
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                           <div className={`text-[9px] font-bold mt-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                {new Date(group.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                           </div>
                                       </div>
                                   </div>
                               );
                           }

                           return (
                               <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'} ${msg.reactions && msg.reactions.length > 0 ? 'mb-5' : 'mb-1'}`}>
                                   <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                       {/* Hover Toolbar */}
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

                                       {/* Reply */}
                                       {msg.replyToId && (
                                           <div className={`text-[10px] text-slate-500 mb-1 px-2 flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                               <i className="fa-solid fa-reply fa-flip-vertical text-slate-400"></i> 
                                               <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-lg opacity-80 truncate max-w-[150px]">{msg.replyToContent || 'Tin nhắn đã xóa'}</span>
                                           </div>
                                       )}

                                       {msg.type === 'sticker' ? (
                                           <div className="relative inline-block group hover:scale-105 transition-transform"><img src={msg.content} alt="Sticker" className="w-32 h-32 object-contain" /></div>
                                       ) : msg.type === 'image' ? (
                                            <div className="relative w-full max-w-[16rem] cursor-pointer group" onClick={() => openLightbox([msg.content], 0)}>
                                                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 relative">
                                                     <SafeImage onImageLoaded={handleImageLoad} src={msg.content} alt="Image" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            </div>
                                       ) : isEmojiOnly(msg.content) ? (
                                           <div className={`px-2 ${isMe ? 'text-right' : 'text-left'} text-5xl`}>{msg.content}</div>
                                       ) : (
                                           <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                                               {msg.content}
                                               <div className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                                                   {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                   {isMe && <i className={`fa-solid ${msg.isRead ? 'fa-check-double text-cyan-300' : 'fa-check text-indigo-300/70'}`}></i>}
                                               </div>
                                           </div>
                                       )}
                                       {msg.reactions && msg.reactions.length > 0 && (
                                           <div className={`absolute bottom-[-14px] ${isMe ? 'right-2' : 'left-2'} flex -space-x-1 z-10 filter drop-shadow-sm`}>
                                               {Array.from(new Set(msg.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                                                   <div key={i} className="bg-white dark:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm border-[2px] border-slate-50 dark:border-slate-900">{emoji as React.ReactNode}</div>
                                               ))}
                                               <div className="bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 h-6 flex items-center justify-center text-[9px] font-bold text-slate-500 border-[2px] border-slate-50 dark:border-slate-900 shadow-sm min-w-[20px]">{msg.reactions.length}</div>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           );
                       })}
                   </div>

                   {/* Footer */}
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

                       {pendingImages.length > 0 && (
                           <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 flex flex-col gap-2 border-b border-slate-100 dark:border-slate-600">
                               <div className="flex justify-between items-center"><span className="font-bold text-xs text-indigo-500"><i className="fa-solid fa-images"></i> {pendingImages.length} Ảnh</span><button onClick={() => setPendingImages([])} className="text-xs font-bold text-slate-400 hover:text-rose-500">Xóa hết</button></div>
                               <div className="flex gap-3 overflow-x-auto pb-2 pt-2 custom-scrollbar-hover px-1 scroll-smooth snap-x" onWheel={(e) => { if(e.deltaY !== 0) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); } }}>
                                   {pendingImages.map((img) => (
                                       <div key={img.id} className="relative group shrink-0 w-20 h-20 snap-start">
                                           <img src={img.localUrl} alt="Preview" className={`w-full h-full object-cover rounded-xl border ${img.error ? 'border-rose-500' : 'border-slate-200'} shadow-sm`} />
                                           {img.uploading && <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"><i className="fa-solid fa-circle-notch animate-spin text-white text-xs"></i></div>}
                                           {img.error && <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl"><i className="fa-solid fa-triangle-exclamation text-rose-500 text-xl"></i></div>}
                                           <button onClick={() => removePendingImage(img.id)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                       </div>
                                   ))}
                                   <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-500 shrink-0"><i className="fa-solid fa-plus text-2xl"></i></button>
                               </div>
                           </div>
                       )}
                       <div className={`p-3 md:p-4 relative ${user.role === 'master' ? '' : 'md:pr-28'}`}>
                           {showStickerPicker && <div className="absolute bottom-full left-4 mb-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 grid grid-cols-3 gap-2 w-72 h-64 overflow-y-auto z-30">{STICKERS.map((url, i) => <img key={i} src={url} className="w-full h-auto rounded-lg cursor-pointer hover:scale-110" onClick={() => handleSendMessage(url, 'sticker')} />)}</div>}
                           {showEmojiPicker && <div className="absolute bottom-full right-4 mb-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 grid grid-cols-5 gap-2 w-64 z-30">{EMOJIS.map(e => <button key={e} onClick={() => setNewMessage(p => p + e)} className="text-2xl hover:bg-slate-100 p-2 rounded-lg">{e}</button>)}</div>}
                           
                           <div className="flex gap-2 md:gap-3 items-end">
                               <button onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }} className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-pink-500"><i className="fa-solid fa-note-sticky text-lg"></i></button>
                               <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                               <button onClick={() => fileInputRef.current?.click()} className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-emerald-500"><i className="fa-solid fa-image text-lg"></i></button>
                               <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center pr-2 relative transition-all focus-within:ring-2 focus-within:ring-indigo-100 min-w-0">
                                   <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage, 'text')} onPaste={handlePaste} placeholder="Nhập tin nhắn..." className="flex-1 px-3 py-3 md:px-4 md:py-3 bg-transparent outline-none text-sm font-medium text-slate-800 dark:text-white min-w-0" />
                                   <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500"><i className="fa-solid fa-face-smile text-lg"></i></button>
                               </div>
                               <button onClick={() => handleSendMessage(newMessage, 'text')} disabled={isUploading || (!newMessage.trim() && pendingImages.length === 0)} className="shrink-0 w-12 h-10 md:w-14 md:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50">{isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}</button>
                           </div>
                       </div>
                   </div>
               </>
           ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                   <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4"><i className="fa-solid fa-comments text-3xl"></i></div>
                   <h3 className="font-bold text-lg text-slate-600 dark:text-slate-400">Chọn người để chat</h3>
               </div>
           )}
       </div>
    </div>
    {lightboxData && <ImageLightbox images={lightboxData.images} initialIndex={lightboxData.index} onClose={() => setLightboxData(null)} />}
    </>
  );
};

export default CommunityChat;
