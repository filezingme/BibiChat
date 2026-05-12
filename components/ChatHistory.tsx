
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { ChatLog, User } from '../types';

interface Props {
  user: User;
}

interface ChatSession {
    uniqueKey: string;
    sessionId: string;
    userId: string;
    lastActive: number;
    preview: string;
    messageCount: number;
}

const ChatHistory: React.FC<Props> = ({ user }) => {
  const isMaster = user.role === 'master';
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  
  // Pagination & Filter State
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  // Selected Session State
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatLog[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Load
  useEffect(() => {
    if (isMaster) {
        apiService.getAllUsers().then(users => {
            setCustomers(users.filter(u => u.role !== 'master'));
        });
    }
    // Reset and load
    setPage(1);
    setSessions([]);
    loadSessions(1, selectedUserFilter, true);
  }, [user.id, selectedUserFilter]); // Reload when user or filter changes

  // Load when Session Selected
  useEffect(() => {
      if (selectedSession) {
          loadSessionMessages(selectedSession);
      }
  }, [selectedSession]);

  const loadSessions = async (currentPage: number, filter: string, isReset: boolean) => {
    setIsLoadingList(true);
    try {
      const targetUserId = isMaster ? 'all' : user.id;
      const result = await apiService.getChatSessionsPaginated(targetUserId, currentPage, LIMIT, filter);
      
      if (isReset) {
          setSessions(result.data);
      } else {
          setSessions(prev => [...prev, ...result.data]);
      }
      
      setTotalSessions(result.pagination.total);
      setHasMore(currentPage < result.pagination.totalPages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadMoreSessions = () => {
      if (hasMore && !isLoadingList) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadSessions(nextPage, selectedUserFilter, false);
      }
  };

  const loadSessionMessages = async (session: ChatSession) => {
      setIsLoadingMessages(true);
      setMessages([]); // Clear previous
      try {
          // If Master, we can see any session. If User, only own (enforced by API usually)
          // For API simpler logic, we pass 'all' or userId as context, and specific sessionId
          const targetContextId = isMaster ? 'all' : user.id;
          const msgs = await apiService.getChatMessages(targetContextId, session.sessionId);
          setMessages(msgs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingMessages(false);
      }
  };

  const getCustomerEmail = (userId: string) => {
    // If the session belongs to the current logged-in Master Admin, display their info
    if (userId === user.id) return `${user.email} (Me)`;
    return customers.find(c => c.id === userId)?.email || 'Khách ẩn danh';
  };
  
  const getFilterLabel = () => {
     if (selectedUserFilter === 'all') return 'Tất cả khách hàng';
     const found = customers.find(c => c.id === selectedUserFilter);
     return found ? found.email : 'Unknown';
  };

  const handleSelectFilter = (id: string) => {
      setSelectedUserFilter(id);
      setIsDropdownOpen(false);
      setSelectedSession(null); // Deselect on filter change
  };

  // Theme Constants
  const theme = {
      headerIconBg: isMaster ? 'bg-gradient-to-tr from-indigo-500 to-violet-600' : 'bg-gradient-to-tr from-pink-400 to-rose-400',
      headerShadow: isMaster ? 'shadow-indigo-200' : 'shadow-pink-200',
      blobColor: isMaster ? 'bg-indigo-100 dark:bg-indigo-900/20' : 'bg-pink-100 dark:bg-pink-900/20',
      listIconColor: isMaster ? 'text-indigo-400' : 'text-pink-400',
      selectedBorder: isMaster ? 'border-indigo-400 dark:border-indigo-500' : 'border-pink-400 dark:border-pink-500', // Increased border contrast
      hoverBorder: isMaster ? 'hover:border-indigo-100 dark:hover:border-slate-600' : 'hover:border-pink-100 dark:hover:border-slate-600',
      selectedAvatar: isMaster ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-pink-400 to-rose-400',
      hoverAvatar: isMaster ? 'group-hover:bg-indigo-200 group-hover:text-indigo-600' : 'group-hover:bg-pink-200 group-hover:text-pink-500',
      detailIcon: isMaster ? 'text-indigo-400' : 'text-pink-400',
      userBubble: isMaster ? 'bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-indigo-200' : 'bg-gradient-to-tr from-pink-500 to-rose-500 shadow-pink-200',
      botAvatarText: isMaster ? 'text-indigo-500' : 'text-pink-500',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <style>{`
            .custom-scrollbar-hover::-webkit-scrollbar {
                width: 6px;
                background-color: transparent;
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
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-100 dark:shadow-none relative z-30">
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
             <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 ${theme.blobColor}`}></div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <span className={`w-12 h-12 rounded-2xl ${theme.headerIconBg} text-white flex items-center justify-center text-xl shadow-lg ${theme.headerShadow} dark:shadow-none transform -rotate-6`}>
                 <i className="fa-solid fa-clock-rotate-left"></i>
              </span>
              Lịch sử Trò chuyện
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold ml-1 mt-1">
                {isMaster ? 'Giám sát toàn bộ hội thoại hệ thống' : 'Lưu giữ mọi khoảnh khắc tương tác'}
            </p>
          </div>
          
          {isMaster && (
            <div className="w-full sm:w-auto relative z-20" ref={dropdownRef}>
              <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full sm:w-72 flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-bold hover:border-indigo-400 hover:shadow-md transition-all text-slate-600 dark:text-slate-200 group"
                >
                  <span className="truncate flex items-center gap-2">
                     <i className="fa-solid fa-filter text-indigo-400 group-hover:text-indigo-500"></i>
                     {getFilterLabel()}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs transition-transform text-slate-400 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>
              
              {isDropdownOpen && (
                  <div className="absolute top-full right-0 w-full sm:w-72 mt-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-600 rounded-2xl shadow-2xl z-[100] max-h-80 overflow-y-auto animate-in fade-in zoom-in duration-200 p-2 custom-scrollbar-hover">
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleSelectFilter('all'); }}
                      className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 mb-1 ${selectedUserFilter === 'all' ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center"><i className="fa-solid fa-users"></i></div>
                      Tất cả khách hàng
                    </div>
                    {customers.map(c => (
                      <div 
                        key={c.id} 
                        onClick={(e) => { e.stopPropagation(); handleSelectFilter(c.id); }}
                        className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 mb-1 ${selectedUserFilter === c.id ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">{c.email.charAt(0).toUpperCase()}</div>
                        <span className="truncate">{c.email}</span>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* List Column - Compact but Styled */}
        <div className={`lg:col-span-1 flex flex-col h-full overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none p-4 ${selectedSession ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between px-2 mb-4">
             <h3 className="font-bold text-slate-600 dark:text-slate-300 text-sm flex items-center gap-2">
                <i className={`fa-solid fa-list-ul ${theme.listIconColor}`}></i>
                Phiên hội thoại ({totalSessions})
             </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 scroll-smooth custom-scrollbar-hover">
            {sessions.length > 0 ? (
              <>
              {sessions.map(session => {
                const isSelected = selectedSession?.uniqueKey === session.uniqueKey;
                return (
                  <div 
                    key={session.uniqueKey}
                    onClick={() => setSelectedSession(session)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 border-2 flex gap-3 group relative overflow-hidden ${
                      isSelected
                      ? `bg-white dark:bg-slate-800 ${theme.selectedBorder} shadow-md` 
                      : `bg-white/60 dark:bg-slate-800/60 border-transparent hover:bg-white dark:hover:bg-slate-800 ${theme.hoverBorder}`
                    }`}
                  >
                    {/* Compact Avatar */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 border border-white dark:border-slate-600 transition-transform ${isSelected ? `${theme.selectedAvatar} scale-105` : `bg-slate-200 dark:bg-slate-700 text-slate-400 ${theme.hoverAvatar}`}`}>
                        {isMaster ? getCustomerEmail(session.userId).charAt(0).toUpperCase() : <i className="fa-solid fa-comments"></i>}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-0.5">
                            <p className={`text-xs font-bold truncate pr-2 ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                {isMaster ? getCustomerEmail(session.userId) : `Phiên #${session.sessionId.substring(0,4)}`}
                            </p>
                            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                {new Date(session.lastActive).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                             <p className={`text-[11px] truncate w-full ${isSelected ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400 font-medium'}`}>
                                {session.preview}
                             </p>
                        </div>
                    </div>

                    {/* Mini Status Dot */}
                    <div className="flex flex-col justify-center items-end pl-1">
                        <div className="text-slate-300 text-[10px] font-bold">
                            {session.messageCount} <i className="fa-solid fa-message"></i>
                        </div>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                  <button 
                    onClick={loadMoreSessions}
                    disabled={isLoadingList}
                    className="w-full py-3 text-xs font-bold text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-700/50 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                      {isLoadingList ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-arrow-down"></i>}
                      Tải thêm
                  </button>
              )}
              </>
            ) : isLoadingList ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center animate-spin mb-2 shadow-md">
                     <i className={`fa-solid fa-circle-notch ${theme.listIconColor}`}></i>
                  </div>
                  <p className="text-xs font-bold text-slate-400">Đang tải...</p>
               </div>
            ) : (
              <div className="text-center p-8 h-full flex flex-col items-center justify-center opacity-50">
                 <i className="fa-solid fa-inbox text-4xl text-slate-300 mb-2"></i>
                 <p className="text-xs font-bold text-slate-400">Trống trơn</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Column */}
        <div className={`lg:col-span-2 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full relative ${!selectedSession ? 'hidden lg:flex' : 'flex'}`}>
           {/* Background Pattern */}
           <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           
           {selectedSession ? (
             <>
                <div className="p-4 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md flex justify-between items-center shadow-sm z-10 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedSession(null)} className="lg:hidden w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-500 transition-all">
                      <i className="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                        <i className={`fa-solid fa-wand-magic-sparkles ${theme.detailIcon}`}></i>
                        Chi tiết phiên chat
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider pl-6">
                        ID: {selectedSession.sessionId}
                      </p>
                    </div>
                  </div>
                  {isMaster && (
                    <div className="hidden sm:flex text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 items-center">
                      <i className="fa-solid fa-user-astronaut mr-1.5"></i>
                      {getCustomerEmail(selectedSession.userId)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 relative z-0 custom-scrollbar-hover">
                  {isLoadingMessages ? (
                      <div className="flex flex-col items-center justify-center h-full">
                          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-sm font-bold text-slate-400">Đang tải nội dung...</p>
                      </div>
                  ) : (
                      <>
                        {/* Time Separator */}
                        {messages.length > 0 && (
                            <div className="flex justify-center">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-600">
                                Bắt đầu lúc {new Date(messages[0].timestamp).toLocaleString('vi-VN')}
                                </span>
                            </div>
                        )}

                        {messages.map((log) => (
                            <React.Fragment key={log.id}>
                                {/* User Message */}
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] lg:max-w-[75%] space-y-2 group">
                                    <div className="flex justify-end items-end gap-2">
                                        <div className={`${theme.userBubble} text-white px-5 py-3 rounded-[1.5rem] rounded-tr-none shadow-lg dark:shadow-none text-sm font-medium leading-relaxed relative border-2 border-white dark:border-slate-700`}>
                                            {log.query}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                                            <i className="fa-solid fa-user text-xs text-slate-500"></i>
                                        </div>
                                    </div>
                                    </div>
                                </div>

                                {/* AI Response */}
                                <div className="flex justify-start">
                                    <div className="max-w-[90%] lg:max-w-[80%] space-y-2">
                                    <div className="flex items-end gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-lg shadow-md shrink-0 mb-1 z-10">
                                        <i className={`fa-solid fa-robot animate-pulse ${theme.botAvatarText}`}></i>
                                        </div>
                                        <div>
                                            <div className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 px-5 py-4 rounded-[1.5rem] rounded-tl-none shadow-md text-sm font-medium leading-relaxed whitespace-pre-wrap relative">
                                            {log.answer}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 ml-2">
                                            {!log.isSolved && (
                                                <span className="text-[9px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full font-bold flex items-center border border-rose-100 dark:border-rose-900 animate-pulse">
                                                <i className="fa-solid fa-circle-exclamation mr-1"></i>
                                                Chưa tìm thấy thông tin
                                                </span>
                                            )}
                                            <span className="text-[9px] text-slate-300 font-bold ml-auto pr-2">
                                                {new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                      </>
                  )}
                </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 p-8 text-center relative z-10">
               <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full border-[6px] border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center mb-6">
                 <i className={`fa-solid fa-comments text-4xl ${isMaster ? 'text-indigo-200 dark:text-slate-600' : 'text-pink-200 dark:text-slate-600'}`}></i>
               </div>
               <h3 className="text-xl font-bold text-slate-700 dark:text-slate-400 mb-2">Chọn phiên chat để xem</h3>
               <p className="text-sm text-slate-400">Danh sách phiên bên trái kìa bạn ơi 👇</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
