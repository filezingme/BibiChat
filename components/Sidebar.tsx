
import React, { useState } from 'react';
import { View, User } from '../types';
import { apiService } from '../services/apiService';

interface Props {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const Sidebar: React.FC<Props> = ({ currentView, onViewChange, onLogout, isOpen, onClose, user }) => {
  const isMaster = user.role === 'master';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu không khớp' });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu quá ngắn (>= 6 ký tự)' });
      return;
    }

    try {
      const result = await apiService.changePassword(user.id, user.password || '', passwordForm.new);
      if (result.success) {
        setPasswordMsg({ type: 'success', text: result.message });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordForm({ old: '', new: '', confirm: '' });
          setPasswordMsg({ type: '', text: '' });
        }, 1500);
      } else {
        setPasswordMsg({ type: 'error', text: result.message });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Lỗi hệ thống' });
    }
  };

  const menuItems = [
    { id: View.DASHBOARD, label: 'Tổng quan', icon: 'fa-solid fa-chart-pie' },
    ...(isMaster ? [
      { id: View.CUSTOMER_MANAGEMENT, label: 'Quản lý Khách hàng', icon: 'fa-solid fa-users-gear' },
      { id: View.CHAT_HISTORY, label: 'Lịch sử Hệ thống', icon: 'fa-solid fa-clock-rotate-left' },
      { id: View.DEPLOYMENT_GUIDE, label: 'Hướng dẫn', icon: 'fa-solid fa-circle-question' },
    ] : [
      { id: View.CHAT_HISTORY, label: 'Lịch sử Chat', icon: 'fa-solid fa-comments' },
      { id: View.KNOWLEDGE_BASE, label: 'Kho tri thức', icon: 'fa-solid fa-book-open' },
      { id: View.WIDGET_CONFIG, label: 'Làm đẹp Widget', icon: 'fa-solid fa-wand-magic-sparkles' },
      { id: View.INTEGRATION, label: 'Mã nhúng', icon: 'fa-solid fa-code' },
    ]),
  ];

  return (
    <>
    <div className={`
      fixed inset-y-4 left-4 z-50 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white dark:border-slate-700 rounded-[2.5rem] flex flex-col py-8 transition-all duration-300 lg:relative lg:translate-x-0 shadow-2xl shadow-pink-200/40 dark:shadow-none
      ${isOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'}
    `}>
      <div className="px-8 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 ${isMaster ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-tr from-pink-400 to-violet-500'} rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-pink-300/50 dark:shadow-none transform hover:rotate-6 transition-transform cursor-pointer group`}>
            <i className={`fa-solid ${isMaster ? 'fa-crown' : 'fa-robot'} text-2xl group-hover:scale-110 transition-transform`}></i>
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-800 dark:text-white block leading-none mb-1 group cursor-pointer">
              Bibi<span className="text-pink-500">Chat</span>
            </span>
            <span className={`block ${isMaster ? 'text-sm font-bold text-indigo-500 tracking-widest uppercase' : 'font-cute font-bold text-slate-500 text-[1.2rem]'}`}>
              {isMaster ? 'Master Admin' : 'Trợ lý AI siêu Cute'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-pink-500 transition-colors">
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <nav className="flex-1 px-6 space-y-3 overflow-y-auto no-scrollbar">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-5 px-6 py-5 rounded-[2rem] transition-all duration-300 group relative overflow-hidden ${
              currentView === item.id 
              ? (isMaster 
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-200 dark:ring-indigo-900 scale-[1.03]' 
                  : 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/30 ring-2 ring-pink-200 dark:ring-pink-900 scale-[1.03]')
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-pink-600 dark:hover:text-pink-300 font-bold hover:scale-[1.02]'
            }`}
          >
            <i className={`${item.icon} w-6 text-center text-xl ${currentView === item.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-current transition-colors'}`}></i>
            <span className="text-base font-bold tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-6 mt-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-[2rem] p-5 shadow-sm relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:border-pink-200 dark:hover:border-slate-500">
           <div className="flex items-center gap-4 relative z-10">
             <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md border-4 border-white dark:border-slate-600 ${isMaster ? 'bg-gradient-to-tr from-slate-700 to-slate-900' : 'bg-gradient-to-tr from-pink-400 to-orange-400'}`}>
               {user.email.substring(0, 1).toUpperCase()}
             </div>
             <div className="overflow-hidden min-w-0 flex-1">
               <p className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{isMaster ? 'Administrator' : 'Doanh nghiệp'}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-bold">{user.email}</p>
             </div>
             {/* Indicator Icon */}
             <div className="text-slate-300 dark:text-slate-500 group-hover:text-pink-500 transition-colors">
                <i className="fa-solid fa-chevron-up text-xs group-hover:rotate-180 transition-transform duration-300"></i>
             </div>
           </div>
           
           <div className="grid grid-cols-2 gap-3 max-h-0 opacity-0 group-hover:max-h-32 group-hover:opacity-100 group-hover:mt-5 group-focus-within:max-h-32 group-focus-within:opacity-100 group-focus-within:mt-5 transition-all duration-300 ease-out overflow-hidden">
             <button 
                onClick={() => setShowPasswordModal(true)}
                className="col-span-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-400 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-600 rounded-2xl transition-all"
              >
                Đổi pass
             </button>
             <button 
               onClick={onLogout}
               className="col-span-1 text-xs font-bold text-rose-500 hover:text-rose-600 py-3 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-2xl transition-all"
             >
               Thoát
             </button>
           </div>
        </div>
      </div>
    </div>

    {/* CUTE Change Password Modal */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in fade-in zoom-in duration-300 border-[6px] border-slate-100 dark:border-slate-700"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button 
            onClick={() => setShowPasswordModal(false)}
            className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors z-20"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
             <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-900/40 dark:to-rose-900/40 text-rose-500 dark:text-rose-300 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl shadow-pink-200/50 dark:shadow-none border-4 border-white dark:border-slate-700 transform -rotate-12 hover:rotate-12 transition-transform duration-500">
               <i className="fa-solid fa-user-lock"></i>
             </div>
             <h3 className="text-2xl font-black text-slate-800 dark:text-white">Bảo mật tài khoản</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Đổi mật khẩu định kỳ cho an toàn nha!</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
             {passwordMsg.text && (
               <div className={`p-4 rounded-2xl text-sm font-bold flex items-center animate-in slide-in-from-top-2 ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                 <i className={`fa-solid ${passwordMsg.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'} mr-2 text-lg`}></i>
                 {passwordMsg.text}
               </div>
             )}
             
             <div className="space-y-4">
               <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors">
                    <i className="fa-solid fa-key"></i>
                 </div>
                 <input 
                   type="password" 
                   required
                   className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500 rounded-2xl text-sm font-bold focus:outline-none transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-black/20"
                   placeholder="Mật khẩu cũ"
                   value={passwordForm.old}
                   onChange={e => setPasswordForm({...passwordForm, old: e.target.value})}
                 />
               </div>

               <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors">
                    <i className="fa-solid fa-lock"></i>
                 </div>
                 <input 
                   type="password" 
                   required
                   className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500 rounded-2xl text-sm font-bold focus:outline-none transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-black/20"
                   placeholder="Mật khẩu mới (>= 6 ký tự)"
                   value={passwordForm.new}
                   onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                 />
               </div>

               <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors">
                    <i className="fa-solid fa-shield-halved"></i>
                 </div>
                 <input 
                   type="password" 
                   required
                   className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500 rounded-2xl text-sm font-bold focus:outline-none transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-black/20"
                   placeholder="Nhập lại mật khẩu mới"
                   value={passwordForm.confirm}
                   onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                 />
               </div>
             </div>
             
             <button type="submit" className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl font-black shadow-xl shadow-pink-200 dark:shadow-none transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-base group">
               <span>Cập nhật ngay</span>
               <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
             </button>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

export default Sidebar;
