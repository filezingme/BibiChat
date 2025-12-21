
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface Props {
  onViewStats: (userId: string) => void;
  onStartChat: (userId: string) => void; 
}

const CustomerManagement: React.FC<Props> = ({ onViewStats, onStartChat }) => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const LIMIT = 10; // Number of items per page

  // States for Modals
  const [resetModal, setResetModal] = useState<{ isOpen: boolean, userId: string | null, email: string }>({ isOpen: false, userId: null, email: '' });
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, userId: string | null, email: string }>({ isOpen: false, userId: null, email: '' });
  
  // New: Professional Password View Modal State
  const [viewPassModal, setViewPassModal] = useState<{ isOpen: boolean, email: string, pass: string }>({ isOpen: false, email: '', pass: '' });
  const [copySuccess, setCopySuccess] = useState(false);

  const [actionMsg, setActionMsg] = useState<{ type: string, text: string }>({ type: '', text: '' });
  
  // Loading state for modal actions
  const [isProcessing, setIsProcessing] = useState(false);

  // Debounce search function
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1); // Reset to page 1 on new search
      loadCustomers(1, searchTerm);
    }, 300); // Reduced to 300ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setPage(newPage);
          loadCustomers(newPage, searchTerm);
      }
  };

  const loadCustomers = async (currentPage: number, search: string) => {
    setIsLoading(true);
    try {
      // Fetch paginated data
      const result = await apiService.getUsersPaginated(currentPage, LIMIT, search);
      // Filter out 'master' role locally just in case, though server handles logic mostly
      const filtered = result.data.filter(u => u.role !== 'master');
      setCustomers(filtered);
      setTotalPages(result.totalPages);
      // Ensure we display total count even if it's 0, based on API result
      setTotalUsers(result.total);
    } catch (err) {
      console.error("Lỗi khi tải khách hàng:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal.userId || !newResetPassword) return;
    setIsProcessing(true);
    try {
      // Removed artificial delay
      const result = await apiService.resetUserPassword(resetModal.userId, newResetPassword);
      if (result.success) {
        // Update local state immediately so "View Credentials" shows new password without reload
        setCustomers(prev => prev.map(c => 
            c.id === resetModal.userId ? { ...c, password: newResetPassword } : c
        ));

        setActionMsg({ type: 'success', text: `Đã đổi pass cho ${resetModal.email}` });
        setResetModal({ isOpen: false, userId: null, email: '' });
        setNewResetPassword('');
      } else {
        setActionMsg({ type: 'error', text: result.message });
      }
    } catch (e) {
      setActionMsg({ type: 'error', text: 'Lỗi hệ thống' });
    }
    setIsProcessing(false);
    setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.userId) return;
    setIsProcessing(true);
    try {
      // Removed artificial delay
      const result = await apiService.deleteUser(deleteModal.userId);
      if (result.success) {
        setActionMsg({ type: 'success', text: `Đã xóa bé ${deleteModal.email}` });
        setDeleteModal({ isOpen: false, userId: null, email: '' });
        loadCustomers(page, searchTerm); 
      } else {
        setActionMsg({ type: 'error', text: result.message });
      }
    } catch (e) {
      setActionMsg({ type: 'error', text: 'Lỗi hệ thống' });
    }
    setIsProcessing(false);
    setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
  };

  const handleCopyPassword = () => {
      navigator.clipboard.writeText(viewPassModal.pass);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <>
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-lg shadow-indigo-50/50 dark:shadow-none">
        <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                <span className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-300 flex items-center justify-center mr-3 text-lg">
                  <i className="fa-solid fa-users"></i>
                </span>
                Quản lý khách hàng
              </h2>
              {/* Correctly display total count */}
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-1 mt-1">
                 Tổng cộng: {totalUsers} khách hàng
              </p>
            </div>
            <button 
              onClick={() => loadCustomers(page, searchTerm)}
              disabled={isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-600 shadow-sm"
              title="Làm mới danh sách"
            >
              <i className={`fa-solid fa-arrows-rotate ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
        </div>
        <div className="relative w-full md:w-80 group">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors"></i>
          <input 
            type="text" 
            placeholder="Tìm theo email hoặc tên bot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-700 rounded-full focus:border-indigo-300 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none text-sm font-bold transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                title="Xóa tìm kiếm"
            >
                <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-700 overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[700px]">
            <thead>
              <tr className="bg-indigo-50/50 dark:bg-slate-700/50">
                <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-l-2xl pl-8 whitespace-nowrap">
                  <i className="fa-solid fa-user-tag mr-2 text-indigo-400"></i>
                  Khách hàng
                </th>
                <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap text-center">
                  <i className="fa-solid fa-robot mr-2 text-pink-400"></i>
                  Tên AI Bot
                </th>
                <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                  <i className="fa-regular fa-calendar-check mr-2 text-purple-400"></i>
                  Ngày tham gia
                </th>
                {/* Updated Alignment: Changed to text-center to match request, keeping content right-aligned for buttons */}
                <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-r-2xl text-center pr-8 whitespace-nowrap">
                  <i className="fa-solid fa-wand-magic-sparkles mr-2 text-amber-400"></i>
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center animate-bounce mb-4">
                          <i className="fa-solid fa-binoculars text-pink-500 text-2xl"></i>
                       </div>
                       <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map(customer => (
                  <tr key={customer.id} className="bg-white dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-colors group rounded-2xl">
                    <td className="px-6 py-4 pl-8 rounded-l-2xl border-b border-slate-50 dark:border-slate-700/50">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-200 to-purple-200 dark:from-indigo-900 dark:to-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold mr-4 text-lg shadow-sm border-2 border-white dark:border-slate-600">
                          {customer.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{customer.email}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block mt-1 border border-slate-100 dark:border-slate-600">#{customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center border-b border-slate-50 dark:border-slate-700/50">
                      <div className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg sm:rounded-full border border-slate-100 dark:border-slate-600 shadow-sm max-w-[120px] sm:max-w-none">
                         <span className="w-2 h-2 rounded-full mr-1.5 sm:mr-2 shrink-0 border border-slate-100" style={{ backgroundColor: customer.botSettings.primaryColor }}></span>
                         <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{customer.botSettings.botName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-700/50">
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center">
                        <i className="fa-regular fa-clock mr-2 text-indigo-300 dark:text-indigo-600"></i>
                        {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </td>
                    {/* Content still right-aligned to keep buttons tidy */}
                    <td className="px-6 py-4 rounded-r-2xl border-b border-slate-50 dark:border-slate-700/50 pr-8 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* New Chat Button */}
                        <button 
                          onClick={() => onStartChat(customer.id)}
                          className="w-10 h-10 flex items-center justify-center bg-teal-50 dark:bg-teal-900/20 text-teal-500 dark:text-teal-400 rounded-full hover:bg-teal-500 hover:text-white transition-all shadow-sm hover:scale-110 border border-teal-100 dark:border-transparent hover:border-teal-200"
                          title="Trò chuyện ngay"
                        >
                          <i className="fa-solid fa-comment-dots text-sm"></i>
                        </button>

                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        {/* Improved Password View Button */}
                        <button 
                          onClick={() => setViewPassModal({ isOpen: true, email: customer.email, pass: customer.password || 'Trống' })}
                          className="w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-full hover:bg-indigo-500 hover:text-white transition-all shadow-sm hover:scale-110 border border-indigo-100 dark:border-transparent hover:border-indigo-200"
                          title="Xem thông tin đăng nhập"
                        >
                          <i className="fa-solid fa-id-card text-sm"></i>
                        </button>

                        <button 
                          onClick={() => onViewStats(customer.id)}
                          className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-sm hover:scale-110 border border-blue-100 dark:border-transparent hover:border-blue-200"
                          title="Xem báo cáo"
                        >
                          <i className="fa-solid fa-chart-line text-sm"></i>
                        </button>
                        <button 
                          onClick={() => {
                            setResetModal({ isOpen: true, userId: customer.id, email: customer.email });
                            setNewResetPassword('');
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 rounded-full hover:bg-amber-500 hover:text-white transition-all shadow-sm hover:scale-110 border border-amber-100 dark:border-transparent hover:border-amber-200"
                          title="Reset mật khẩu"
                        >
                          <i className="fa-solid fa-key text-sm"></i>
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, userId: customer.id, email: customer.email })}
                          className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:scale-110 border border-rose-100 dark:border-transparent hover:border-rose-200"
                          title="Xóa tài khoản"
                        >
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-500 mx-auto mb-6">
                        <i className="fa-solid fa-face-sad-tear text-4xl"></i>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Không tìm thấy ai hết</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Thử tìm từ khóa khác xem sao nha.</p>
                      <button onClick={() => { setSearchTerm(''); handlePageChange(1); }} className="mt-4 text-indigo-500 font-bold text-sm hover:underline">
                        Xóa bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalUsers > 0 && (
            <div className="flex items-center justify-between p-6 border-t border-slate-50 dark:border-slate-700/50">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    Hiển thị {((page - 1) * LIMIT) + 1} - {Math.min(page * LIMIT, totalUsers)} trong số {totalUsers}
                </span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handlePageChange(page - 1)} 
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Trước
                    </button>
                    <div className="flex items-center gap-1 px-2">
                        {[...Array(totalPages)].map((_, i) => {
                            const p = i + 1;
                            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                                return (
                                    <button 
                                        key={p} 
                                        onClick={() => handlePageChange(p)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${page === p ? 'bg-indigo-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {p}
                                    </button>
                                );
                            } else if (p === page - 2 || p === page + 2) {
                                return <span key={p} className="text-slate-300 text-xs">...</span>;
                            }
                            return null;
                        })}
                    </div>
                    <button 
                        onClick={() => handlePageChange(page + 1)} 
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Sau
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>

      {/* Toast Notification & Modals... (Keep existing code) */}
      {actionMsg.text && createPortal(
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-3xl shadow-xl border flex items-center animate-in slide-in-from-right duration-300 ${actionMsg.type === 'success' ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400'}`}>
          <i className={`fa-solid ${actionMsg.type === 'success' ? 'fa-check-circle' : 'fa-heart-crack'} text-xl mr-3`}></i>
          <span className="font-bold text-sm">{actionMsg.text}</span>
        </div>,
        document.body
      )}

      {/* View Password Modal */}
      {viewPassModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setViewPassModal({ ...viewPassModal, isOpen: false })}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 relative animate-in fade-in zoom-in duration-300 border border-white dark:border-slate-700" onClick={e => e.stopPropagation()}>
             <button onClick={() => setViewPassModal({ ...viewPassModal, isOpen: false })} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors z-20"><i className="fa-solid fa-xmark text-lg"></i></button>
             
             <div className="text-center mb-8">
               <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg border-4 border-white dark:border-slate-600 transform -rotate-6">
                 <i className="fa-solid fa-shield-cat"></i>
               </div>
               <h3 className="text-2xl font-black text-slate-800 dark:text-white">Thông tin bảo mật</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Thông tin đăng nhập của khách hàng.</p>
             </div>

             <div className="space-y-5">
                <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase mb-2 ml-1">Email đăng nhập</label>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <i className="fa-solid fa-envelope text-slate-400"></i>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{viewPassModal.email}</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase mb-2 ml-1">Mật khẩu hiện tại</label>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800 flex items-center justify-between group cursor-pointer relative overflow-hidden" onClick={handleCopyPassword}>
                        <div className="flex items-center gap-3 relative z-10">
                            <i className="fa-solid fa-key text-indigo-500"></i>
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-lg tracking-wider">{viewPassModal.pass}</span>
                        </div>
                        <button className="text-indigo-400 hover:text-indigo-600 transition-colors relative z-10">
                            <i className={`fa-solid ${copySuccess ? 'fa-check' : 'fa-copy'} text-lg`}></i>
                        </button>
                        {copySuccess && <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center text-white font-bold text-sm animate-in fade-in duration-200 z-20">Đã sao chép!</div>}
                    </div>
                </div>
             </div>

             <div className="mt-8 text-center">
                <p className="text-xs text-slate-400 font-medium bg-slate-50 dark:bg-slate-900 py-2 px-4 rounded-xl inline-block border border-slate-100 dark:border-slate-700">
                    <i className="fa-solid fa-lock mr-1.5"></i> 
                    Chỉ xem khi thực sự cần thiết nhé!
                </p>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Password Modal */}
      {resetModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300 border border-white dark:border-slate-700">
             <div className="p-8 text-center">
               <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg shadow-amber-200 dark:shadow-none transform rotate-12">
                 <i className="fa-solid fa-key"></i>
               </div>
               <h3 className="text-xl font-black text-slate-800 dark:text-white">Reset mật khẩu</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                 Tạo mật khẩu mới cho <span className="font-bold text-slate-900 dark:text-slate-200">{resetModal.email}</span>.
               </p>
               <input 
                 type="text" 
                 placeholder="Nhập mật khẩu mới..."
                 className="w-full mt-6 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent rounded-2xl text-sm font-bold text-center focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-amber-300 dark:focus:border-amber-600 transition-all text-slate-800 dark:text-white"
                 value={newResetPassword}
                 onChange={e => setNewResetPassword(e.target.value)}
                 disabled={isProcessing}
               />
               <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={() => setResetModal({ isOpen: false, userId: null, email: '' })} disabled={isProcessing} className="py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">Hủy nha</button>
                 <button onClick={handleResetPassword} disabled={isProcessing} className="py-3.5 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 dark:shadow-none flex justify-center items-center gap-2 disabled:opacity-70">
                    {isProcessing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Xác nhận'}
                 </button>
               </div>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300 border border-white dark:border-slate-700">
             <div className="p-8 text-center">
               <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-3xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg shadow-rose-200 dark:shadow-none transform -rotate-12">
                 <i className="fa-solid fa-trash-can"></i>
               </div>
               <h3 className="text-xl font-black text-slate-800 dark:text-white">Xác nhận xóa bé này?</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                 Tài khoản <span className="font-bold text-slate-900 dark:text-slate-200">{deleteModal.email}</span> sẽ bị xóa vĩnh viễn cùng toàn bộ dữ liệu đó nha.
               </p>
               <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={() => setDeleteModal({ isOpen: false, userId: null, email: '' })} disabled={isProcessing} className="py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">Giữ lại</button>
                 <button onClick={handleDeleteUser} disabled={isProcessing} className="py-3.5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 dark:shadow-none flex justify-center items-center gap-2 disabled:opacity-70">
                    {isProcessing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Xóa luôn'}
                 </button>
               </div>
             </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CustomerManagement;
