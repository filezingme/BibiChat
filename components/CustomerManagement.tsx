
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface Props {
  onViewStats: (userId: string) => void;
}

const CustomerManagement: React.FC<Props> = ({ onViewStats }) => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // States for Modals
  const [resetModal, setResetModal] = useState<{ isOpen: boolean, userId: string | null, email: string }>({ isOpen: false, userId: null, email: '' });
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, userId: string | null, email: string }>({ isOpen: false, userId: null, email: '' });
  const [actionMsg, setActionMsg] = useState<{ type: string, text: string }>({ type: '', text: '' });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAllUsers();
      const filtered = data.filter(u => u.role !== 'master');
      setCustomers(filtered);
    } catch (err) {
      console.error("Lỗi khi tải khách hàng:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal.userId || !newResetPassword) return;
    try {
      const result = await apiService.resetUserPassword(resetModal.userId, newResetPassword);
      if (result.success) {
        setActionMsg({ type: 'success', text: `Đã đổi pass cho ${resetModal.email}` });
        setResetModal({ isOpen: false, userId: null, email: '' });
        setNewResetPassword('');
      } else {
        setActionMsg({ type: 'error', text: result.message });
      }
    } catch (e) {
      setActionMsg({ type: 'error', text: 'Lỗi hệ thống' });
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.userId) return;
    try {
      const result = await apiService.deleteUser(deleteModal.userId);
      if (result.success) {
        setActionMsg({ type: 'success', text: `Đã xóa bé ${deleteModal.email}` });
        setDeleteModal({ isOpen: false, userId: null, email: '' });
        loadCustomers(); 
      } else {
        setActionMsg({ type: 'error', text: result.message });
      }
    } catch (e) {
      setActionMsg({ type: 'error', text: 'Lỗi hệ thống' });
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
  };

  const filteredCustomers = customers.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.botSettings.botName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Toast Notification */}
      {actionMsg.text && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-3xl shadow-xl border flex items-center animate-in slide-in-from-right duration-300 ${actionMsg.type === 'success' ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400'}`}>
          <i className={`fa-solid ${actionMsg.type === 'success' ? 'fa-check-circle' : 'fa-heart-crack'} text-xl mr-3`}></i>
          <span className="font-bold text-sm">{actionMsg.text}</span>
        </div>
      )}

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
            </div>
            <button 
              onClick={loadCustomers}
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
            className="w-full pl-11 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-700 rounded-full focus:border-indigo-300 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none text-sm font-bold transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
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
                <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-r-2xl text-right pr-8 whitespace-nowrap">
                  <i className="fa-solid fa-wand-magic-sparkles mr-2 text-amber-400"></i>
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <i className="fa-solid fa-circle-notch animate-spin text-indigo-400 text-3xl"></i>
                    <p className="text-sm font-bold text-slate-400 mt-4">Đang tìm kiếm...</p>
                  </td>
                </tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
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
                    <td className="px-6 py-4 text-right pr-8 rounded-r-2xl border-b border-slate-50 dark:border-slate-700/50">
                      <div className="flex justify-end gap-2">
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
                      <button onClick={loadCustomers} className="mt-4 text-indigo-500 font-bold text-sm hover:underline">
                        Tải lại danh sách
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
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
               />
               <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={() => setResetModal({ isOpen: false, userId: null, email: '' })} className="py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Hủy nha</button>
                 <button onClick={handleResetPassword} className="py-3.5 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 dark:shadow-none">Xác nhận</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
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
                 <button onClick={() => setDeleteModal({ isOpen: false, userId: null, email: '' })} className="py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Giữ lại</button>
                 <button onClick={handleDeleteUser} className="py-3.5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 dark:shadow-none">Xóa luôn</button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
