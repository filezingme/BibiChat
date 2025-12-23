
import React from 'react';
import { View, User } from '../types';

interface Props {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void; // Giữ lại để truyền prop, dù không dùng trực tiếp ở đây nữa (logic logout sẽ ở App hoặc Header nếu cần, nhưng Sidebar vẫn nhận prop này từ App)
  isOpen: boolean;
  onClose: () => void;
  user: User;
  unreadMessagesCount?: number; // New Prop
}

const Sidebar: React.FC<Props> = ({ currentView, onViewChange, isOpen, onClose, user, unreadMessagesCount = 0 }) => {
  const isMaster = user.role === 'master';

  const menuItems = [
    { id: View.DASHBOARD, label: 'Tổng quan', icon: 'fa-solid fa-chart-pie' },
    { id: View.DIRECT_MESSAGES, label: 'Chat hỗ trợ', icon: 'fa-solid fa-comments' }, // Renamed
    ...(isMaster ? [
      { id: View.CUSTOMER_MANAGEMENT, label: 'Quản lý Khách hàng', icon: 'fa-solid fa-users-gear' },
      { id: View.NOTIFICATION_MANAGER, label: 'Quản lý Thông báo', icon: 'fa-solid fa-bell' },
      { id: View.CHAT_HISTORY, label: 'Lịch sử Hệ thống', icon: 'fa-solid fa-clock-rotate-left' },
      { id: View.DEPLOYMENT_GUIDE, label: 'Hướng dẫn', icon: 'fa-solid fa-circle-question' },
    ] : [
      { id: View.CHAT_HISTORY, label: 'Lịch sử Chat AI', icon: 'fa-solid fa-robot' },
      { id: View.KNOWLEDGE_BASE, label: 'Kho tri thức', icon: 'fa-solid fa-book-open' },
      { id: View.WIDGET_CONFIG, label: 'Cấu hình Widget', icon: 'fa-solid fa-sliders' }, // Renamed and merged
      { id: View.LEADS, label: 'Danh sách Lead', icon: 'fa-solid fa-address-book' }, 
      { id: View.INTEGRATION, label: 'Mã nhúng', icon: 'fa-solid fa-code' },
    ]),
  ];

  return (
    <>
    {/* Style tag for custom scrollbar behavior */}
    <style>{`
      .sidebar-scroll {
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
      }
      .sidebar-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .sidebar-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb {
        background-color: transparent;
        border-radius: 20px;
      }
      .sidebar-scroll:hover {
        scrollbar-color: #cbd5e1 transparent;
      }
      .dark .sidebar-scroll:hover {
        scrollbar-color: #475569 transparent;
      }
      .sidebar-scroll:hover::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
      }
      .dark .sidebar-scroll:hover::-webkit-scrollbar-thumb {
        background-color: #475569;
      }
    `}</style>

    <div className={`
      fixed inset-y-4 left-4 z-50 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white dark:border-slate-700 rounded-[2.5rem] flex flex-col py-8 transition-all duration-300 lg:relative lg:translate-x-0 shadow-2xl shadow-pink-200/40 dark:shadow-none
      ${isOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'}
    `}>
      <div className="px-8 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 ${isMaster ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-tr from-pink-400 to-violet-500'} rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-pink-300/50 dark:shadow-none transform hover:rotate-6 transition-transform cursor-pointer group`}>
            {/* Updated Icon to Chat Bubble */}
            <i className="fa-solid fa-comment-dots text-2xl group-hover:scale-110 transition-transform"></i>
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-800 dark:text-white block leading-none mb-1 group cursor-pointer">
              Bibi<span className="text-pink-500">Chat</span>
            </span>
            {/* Updated Typography for Master Admin */}
            <span className={`block font-cute font-bold text-[1.2rem] ${isMaster ? 'text-indigo-500' : 'text-slate-500'}`}>
              {isMaster ? 'Master Admin' : 'Trợ lý AI siêu Cute'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-pink-500 transition-colors">
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <nav className="flex-1 px-6 space-y-3 sidebar-scroll">
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
            <div className="relative">
                <i className={`${item.icon} w-6 text-center text-xl ${currentView === item.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-current transition-colors'}`}></i>
                {/* UNREAD BADGE FOR CHAT MENU */}
                {item.id === View.DIRECT_MESSAGES && unreadMessagesCount > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center animate-bounce-slow shadow-sm px-1">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                )}
            </div>
            <span className="text-base font-bold tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Decorative Bottom Element */}
      <div className="px-8 mt-4 text-center">
         <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
               Made with <i className="fa-solid fa-heart text-pink-400 mx-1 animate-beat"></i> by BibiChat
            </p>
         </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;