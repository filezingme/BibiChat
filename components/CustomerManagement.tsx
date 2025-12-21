import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface Props {
  onViewStats: (userId: string) => void;
  onStartChat?: (userId: string) => void;
}

const CustomerManagement: React.FC<Props> = ({ onViewStats, onStartChat }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  useEffect(() => {
    if (confirmResetId) setTimeout(() => setConfirmResetId(null), 3000);
    if (confirmDeleteId) setTimeout(() => setConfirmDeleteId(null), 3000);
  }, [confirmResetId, confirmDeleteId]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.getUsersPaginated(page, 10, search);
      setUsers(result.data.filter(u => u.role !== 'master')); // Filter out admins
      setTotalPages(result.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (confirmDeleteId === id) {
          await apiService.deleteUser(id);
          setUsers(prev => prev.filter(u => u.id !== id));
          setConfirmDeleteId(null);
      } else {
          setConfirmDeleteId(id);
      }
  };

  const handleResetPassword = async (id: string) => {
      if (confirmResetId === id) {
          await apiService.resetUserPassword(id, '123456');
          alert('Đã reset mật khẩu về: 123456');
          setConfirmResetId(null);
      } else {
          setConfirmResetId(id);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2 flex items-center gap-3">
            <span className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-300 rounded-2xl flex items-center justify-center text-xl shadow-sm rotate-3 border-2 border-indigo-200">
               <i className="fa-solid fa-users-gear"></i>
            </span>
            Quản lý Khách hàng
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 font-bold ml-1">Danh sách người dùng đang sử dụng dịch vụ.</p>
        </div>
        <div className="w-full md:w-auto">
            <div className="relative group">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors"></i>
                <input 
                  type="text" 
                  placeholder="Tìm email, tên bot..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-80 pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-sm font-bold text-slate-700 dark:text-white transition-all shadow-sm"
                />
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden p-2">
         <div className="overflow-x-auto min-h-[300px]">
           <table className="w-full text-left border-separate border-spacing-y-2 min-w-[800px]">
             <thead>
               <tr className="bg-indigo-50/50 dark:bg-slate-700/50">
                 <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-l-2xl pl-8 whitespace-nowrap">
                   <i className="fa-solid fa-user-tag mr-2 text-indigo-400"></i>
                   Khách hàng
                 </th>
                 <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                   <i className="fa-solid fa-robot mr-2 text-pink-400"></i>
                   Thông tin Bot
                 </th>
                 <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                   <i className="fa-regular fa-calendar-check mr-2 text-purple-400"></i>
                   Ngày tham gia
                 </th>
                 <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-r-2xl text-left pr-8 whitespace-nowrap">
                   <i className="fa-solid fa-wand-magic-sparkles mr-2 text-amber-400"></i>
                   Hành động
                 </th>
               </tr>
             </thead>
             <tbody className="space-y-2">
               {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                       <td className="px-6 py-5 rounded-l-2xl"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40"></div></td>
                       <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
                       <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div></td>
                       <td className="px-6 py-5 rounded-r-2xl"><div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24"></div></td>
                    </tr>
                  ))
               ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-slate-500 dark:text-slate-400 font-bold">Không tìm thấy khách hàng nào.</td>
                  </tr>
               ) : (
                 users.map(u => (
                   <tr key={u.id} className="bg-slate-50 dark:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors group">
                     <td className="px-6 py-5 rounded-l-2xl pl-8">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                           {u.email.charAt(0).toUpperCase()}
                         </div>
                         <div className="flex flex-col">
                           <span className="font-bold text-slate-800 dark:text-white">{u.email}</span>
                           <span className="text-[10px] text-slate-400 font-bold">ID: {u.id}</span>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-5">
                       <div className="flex flex-col">
                         <span className="font-bold text-indigo-600 dark:text-indigo-400">{u.botSettings.botName}</span>
                         <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{u.botSettings.welcomeMessage}</span>
                       </div>
                     </td>
                     <td className="px-6 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">
                       {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                     </td>
                     <td className="px-6 py-5 rounded-r-2xl pr-8">
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => onViewStats(u.id)}
                           className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600"
                           title="Xem thống kê"
                         >
                           <i className="fa-solid fa-chart-pie"></i>
                         </button>
                         {onStartChat && (
                           <button 
                             onClick={() => onStartChat(u.id)}
                             className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-pink-500 hover:bg-pink-500 hover:text-white transition-all flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600"
                             title="Chat trực tiếp"
                           >
                             <i className="fa-solid fa-comments"></i>
                           </button>
                         )}
                         <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1"></div>
                         <button 
                           onClick={() => handleResetPassword(u.id)}
                           className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm border ${confirmResetId === u.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-800 text-amber-500 border-slate-200 dark:border-slate-600 hover:border-amber-500'}`}
                           title="Reset mật khẩu"
                         >
                           {confirmResetId === u.id ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-key"></i>}
                         </button>
                         <button 
                           onClick={() => handleDelete(u.id)}
                           className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm border ${confirmDeleteId === u.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-slate-800 text-rose-500 border-slate-200 dark:border-slate-600 hover:border-rose-500'}`}
                           title="Xóa tài khoản"
                         >
                           {confirmDeleteId === u.id ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-trash-can"></i>}
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
         
         <div className="flex items-center justify-center p-6 border-t border-slate-50 dark:border-slate-700/50 gap-4">
             <button 
               onClick={() => setPage(p => Math.max(1, p - 1))} 
               disabled={page === 1}
               className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 disabled:opacity-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
             >
               <i className="fa-solid fa-chevron-left"></i>
             </button>
             <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Trang {page} / {totalPages}</span>
             <button 
               onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
               disabled={page === totalPages}
               className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 disabled:opacity-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
             >
               <i className="fa-solid fa-chevron-right"></i>
             </button>
         </div>
      </div>
    </div>
  );
};

export default CustomerManagement;