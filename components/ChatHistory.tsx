
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { ChatLog, User } from '../types';

interface Props {
  user: User;
}

const ChatHistory: React.FC<Props> = ({ user }) => {
  const isMaster = user.role === 'master';
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  
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

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800)); // Cute delay
      if (isMaster) {
        const allUsers = await apiService.getAllUsers();
        setCustomers(allUsers);
        const allLogs = await apiService.getChatLogs('all');
        setLogs(allLogs);
      } else {
        const myLogs = await apiService.getChatLogs(user.id);
        setLogs(myLogs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (selectedUserFilter === 'all') return true;
    return log.userId === selectedUserFilter;
  });

  const getCustomerEmail = (userId: string) => {
    return customers.find(c => c.id === userId)?.email || 'Unknown User';
  };
  
  const getFilterLabel = () => {
     if (selectedUserFilter === 'all') return 'Tất cả khách hàng';
     const found = customers.find(c => c.id === selectedUserFilter);
     return found ? found.email : 'Unknown';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mr-3 text-sm">
               <i className="fa-solid fa-clock-rotate-left"></i>
            </span>
            Lịch sử Trò chuyện
          </h2>
        </div>
        
        {isMaster && (
          <div className="w-full sm:w-auto relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full sm:w-64 flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold hover:border-blue-400 transition-all text-slate-600 dark:text-slate-200 shadow-sm"
              >
                <span className="truncate">{getFilterLabel()}</span>
                <i className={`fa-solid fa-chevron-down text-xs transition-transform text-slate-400 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>
            
            {isDropdownOpen && (
                <div className="absolute top-full right-0 w-full sm:w-64 mt-2 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-200">
                  <div 
                    onClick={() => { setSelectedUserFilter('all'); setIsDropdownOpen(false); }}
                    className={`px-4 py-3 text-sm font-medium cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-600 hover:text-blue-600 dark:hover:text-blue-300 ${selectedUserFilter === 'all' ? 'bg-blue-50 dark:bg-slate-600 text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Tất cả khách hàng
                  </div>
                  {customers.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setSelectedUserFilter(c.id); setIsDropdownOpen(false); }}
                      className={`px-4 py-3 text-sm font-medium cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-600 hover:text-blue-600 dark:hover:text-blue-300 border-t border-slate-50 dark:border-slate-600 ${selectedUserFilter === c.id ? 'bg-blue-50 dark:bg-slate-600 text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {c.email}
                    </div>
                  ))}
                </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Column */}
        <div className={`lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl shadow-lg shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[650px] ${selectedLog ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
             <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Danh sách hội thoại ({filteredLogs.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center animate-bounce mb-3">
                     <i className="fa-regular fa-comment-dots text-blue-500 text-2xl"></i>
                  </div>
                  <p className="text-xs font-bold text-slate-400 animate-pulse">Đang tải tin nhắn...</p>
               </div>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <div 
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    selectedLog?.id === log.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-inner' 
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-500 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {log.isSolved ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đã xong"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Chưa rõ"></span>
                    )}
                  </div>
                  {isMaster && (
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 truncate flex items-center">
                      <i className="fa-solid fa-user-circle mr-1.5 text-blue-400 dark:text-blue-500"></i>
                      {getCustomerEmail(log.userId)}
                    </div>
                  )}
                  <p className={`text-sm font-medium line-clamp-2 leading-relaxed ${selectedLog?.id === log.id ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {log.query || <span className="italic opacity-50">Không có nội dung</span>}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center p-10 text-slate-400 dark:text-slate-600">
                <i className="fa-regular fa-comments text-4xl mb-4 opacity-30"></i>
                <p className="text-sm font-medium">Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Column */}
        <div className={`lg:col-span-2 bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[650px] ${!selectedLog ? 'hidden lg:flex' : 'flex'}`}>
           {selectedLog ? (
             <>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedLog(null)} className="lg:hidden w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300">
                      <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">Chi tiết phiên chat</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                        #{selectedLog.id}
                      </p>
                    </div>
                  </div>
                  {isMaster && (
                    <div className="hidden sm:flex text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 items-center">
                      <i className="fa-solid fa-building-user mr-2 text-blue-500 dark:text-blue-400"></i>
                      {getCustomerEmail(selectedLog.userId)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900">
                  {/* Time Separator */}
                  <div className="flex justify-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full">
                      {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] lg:max-w-[75%] space-y-1">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-md shadow-blue-500/20 text-[15px] font-medium leading-relaxed">
                        {selectedLog.query}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold text-right mr-2">Khách hàng</div>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-[90%] lg:max-w-[80%] space-y-1">
                      <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm shadow-sm shrink-0 mt-1">
                           <i className="fa-solid fa-robot"></i>
                         </div>
                         <div>
                            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 px-5 py-3 rounded-2xl rounded-tl-none shadow-sm text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
                              {selectedLog.answer}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 ml-2">
                              <span className="text-[10px] text-slate-400 font-bold">AI Assistant</span>
                              {!selectedLog.isSolved && (
                                <span className="text-[10px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full font-bold flex items-center border border-rose-100 dark:border-rose-900">
                                  <i className="fa-solid fa-circle-exclamation mr-1"></i>
                                  Chưa xử lý được
                                </span>
                              )}
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
               <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center mb-6">
                 <i className="fa-regular fa-comments text-4xl text-blue-200 dark:text-blue-900"></i>
               </div>
               <p className="text-lg font-bold text-slate-700 dark:text-slate-400">Chưa chọn hội thoại</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
