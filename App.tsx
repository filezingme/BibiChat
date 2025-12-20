
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import KnowledgeBase from './components/KnowledgeBase';
import WidgetPreview from './components/WidgetPreview';
import ChatWidget from './components/ChatWidget';
import Integration from './components/Integration';
import DeploymentGuide from './components/DeploymentGuide';
import CustomerManagement from './components/CustomerManagement';
import ChatHistory from './components/ChatHistory';
import NotificationManager from './components/NotificationManager'; 
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { TermsPage, PrivacyPage, ContactPage, DemoPage } from './components/LegalPages'; 
import { View, Document, WidgetSettings, User, Notification } from './types';
import { apiService } from './services/apiService';

// Định nghĩa kiểu cho trang Public
type PublicViewType = 'landing' | 'login' | 'terms' | 'privacy' | 'contact' | 'demo';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicView, setPublicView] = useState<PublicViewType>('landing'); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCustomerIdForStats, setSelectedCustomerIdForStats] = useState<string>('all');
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omnichat_theme') === 'dark';
    }
    return false;
  });

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showAllNotifModal, setShowAllNotifModal] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Infinite Scroll State for Notifications
  const [visibleNotifCount, setVisibleNotifCount] = useState(20);
  const notifModalScrollRef = useRef<HTMLDivElement>(null);

  // Profile & Password Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  
  const [settings, setSettings] = useState<WidgetSettings>({
    primaryColor: '#8b5cf6', 
    botName: 'Trợ lý AI',
    welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
    position: 'right',
    avatarUrl: 'https://picsum.photos/100/100'
  });

  const viewNames: Record<View, string> = {
    [View.DASHBOARD]: 'Tổng quan',
    [View.KNOWLEDGE_BASE]: 'Kho tri thức',
    [View.WIDGET_CONFIG]: 'Làm đẹp Widget',
    [View.ANALYTICS]: 'Phân tích',
    [View.INTEGRATION]: 'Mã nhúng',
    [View.DEPLOYMENT_GUIDE]: 'Hướng dẫn',
    [View.CUSTOMER_MANAGEMENT]: 'Khách hàng',
    [View.CHAT_HISTORY]: 'Lịch sử chat',
    [View.NOTIFICATION_MANAGER]: 'Quản lý thông báo'
  };

  useEffect(() => {
    // Apply Dark Mode Class
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('omnichat_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('omnichat_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('omnichat_user_id');
    const savedUserRole = localStorage.getItem('omnichat_user_role');
    
    if (savedUserId) {
      setCurrentUser({
         id: savedUserId,
         email: 'Loading...', 
         role: savedUserRole as any || 'user',
         botSettings: settings,
         createdAt: Date.now()
      });
      setIsLoggedIn(true);
      
      apiService.getAllUsers().then(users => {
         const me = users.find(u => u.id === savedUserId);
         if(me) handleLoginSuccess(me);
         else if(savedUserId === 'admin') {
             handleLoginSuccess({ 
                 id: 'admin', 
                 email: 'admin@bibichat.io', 
                 role: 'master', 
                 botSettings: settings, 
                 createdAt: Date.now() 
             });
         }
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Close Notif Dropdown
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setSelectedNotification(null);
      }
      // Close Profile Dropdown
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  // --- Logic Notification Polling ---
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 5000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoggedIn, currentUser?.id]);

  const handleNotifModalScroll = () => {
    if (notifModalScrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = notifModalScrollRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 50) {
            if (visibleNotifCount < notifications.length) {
                setVisibleNotifCount(prev => prev + 20);
            }
        }
    }
  };

  useEffect(() => {
      if (showAllNotifModal) {
          setVisibleNotifCount(20);
          setSelectedNotification(null); // Reset selection when opening modal
      }
  }, [showAllNotifModal]);

  const loadNotifications = async () => {
    if (currentUser) {
      const data = await apiService.getNotifications(currentUser.id);
      setNotifications(data);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    setSelectedNotification(notif);
    if (!notif.isRead && currentUser) {
      await apiService.markNotificationRead(notif.id, currentUser.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await apiService.markAllNotificationsRead(currentUser.id);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLoginSuccess = async (user: User) => {
    setIsLoggedIn(true);
    setPublicView('landing'); 
    setCurrentUser(user);
    setSettings(user.botSettings);
    localStorage.setItem('omnichat_user_id', user.id);
    localStorage.setItem('omnichat_user_role', user.role);
    const docs = await apiService.getDocuments(user.id);
    setDocuments(docs);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('omnichat_user_id');
    localStorage.removeItem('omnichat_user_role');
    setPublicView('landing'); 
    setNotifications([]); 
  };

  // Logic Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu không khớp' });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu quá ngắn (>= 6 ký tự)' });
      return;
    }

    try {
      const result = await apiService.changePassword(currentUser.id, currentUser.password || '', passwordForm.new);
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

  const updateSettings = async (newSettings: WidgetSettings) => {
    setSettings(newSettings);
    if (currentUser) await apiService.updateSettings(currentUser.id, newSettings);
  };

  const addDocument = async (name: string, content: string, type: 'text' | 'file') => {
    if (currentUser) {
      const newDoc = await apiService.addDocument(currentUser.id, name, content, type);
      setDocuments([...documents, newDoc]);
    }
  };

  const deleteDocument = async (id: string) => {
    await apiService.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    if (view !== View.DASHBOARD) setSelectedCustomerIdForStats('all');
  };

  const handleViewCustomerStats = (userId: string) => {
    setSelectedCustomerIdForStats(userId);
    setCurrentView(View.DASHBOARD);
  };

  if (!isLoggedIn) {
    if (publicView === 'terms') return <TermsPage onNavigate={setPublicView} />;
    if (publicView === 'privacy') return <PrivacyPage onNavigate={setPublicView} />;
    if (publicView === 'contact') return <ContactPage onNavigate={setPublicView} />;
    if (publicView === 'demo') return <DemoPage onNavigate={setPublicView} />;
    
    if (publicView === 'landing') {
        return <LandingPage onNavigate={setPublicView} />;
    }

    return (
      <>
        <div className="absolute top-4 left-4 z-50">
           <button 
             onClick={() => setPublicView('landing')}
             className="px-4 py-2 bg-white/50 hover:bg-white rounded-xl text-sm font-bold text-slate-600 transition-all backdrop-blur-sm shadow-sm"
           >
             <i className="fa-solid fa-arrow-left mr-2"></i>Trang chủ
           </button>
        </div>
        <Login onLogin={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden relative font-sans antialiased transition-colors duration-500
      ${darkMode ? 'bg-slate-900 text-slate-100 selection:bg-purple-500 selection:text-white' : 'bg-[#f0f2f5] text-slate-700 selection:bg-pink-100 selection:text-pink-900'}
    `}>
      {/* Dynamic Background Mesh Gradient */}
      {!darkMode && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
           <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      )}
      
      {/* Dark Mode Background Decor */}
      {darkMode && (
         <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]"></div>
         </div>
      )}

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={currentUser!}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="h-20 lg:h-24 flex items-center justify-between px-4 lg:px-8 z-30 shrink-0 transition-all duration-300">
          <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
            {/* Menu Button - shrink-0 ensures it never squashes */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="lg:hidden w-10 h-10 lg:w-12 lg:h-12 shrink-0 bg-white/50 dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-pink-500 hover:text-pink-600 transition-colors backdrop-blur-sm"
            >
              <i className="fas fa-bars text-lg lg:text-xl"></i>
            </button>
            
            {/* Title Container - min-w-0 allows truncate to work in flex */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-sm truncate leading-tight">
                {viewNames[currentView]}
              </h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 hidden lg:block truncate">
                {currentUser?.role === 'master' ? '🚀 Control Center' : '✨ Dashboard Doanh Nghiệp'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
             {/* Dark Mode Toggle - Visible on all screens now */}
             <button 
               onClick={() => setDarkMode(!darkMode)}
               className="flex w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/60 dark:bg-slate-800 border border-white dark:border-slate-700 shadow-sm items-center justify-center text-slate-600 dark:text-yellow-400 hover:scale-110 transition-transform backdrop-blur-sm shrink-0"
               title={darkMode ? "Chuyển sang sáng" : "Chuyển sang tối"}
             >
                <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'} text-lg lg:text-xl`}></i>
             </button>
             
             {/* Notification Bell */}
             <div className="relative" ref={notifRef}>
               <button 
                onClick={() => { setShowNotifications(!showNotifications); setSelectedNotification(null); }}
                className="w-10 h-10 lg:w-12 lg:h-12 bg-white/60 dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-pink-500 dark:hover:text-pink-400 hover:scale-110 transition-all relative active:scale-95 group border border-white dark:border-slate-700 backdrop-blur-sm"
               >
                 <i className={`fa-regular fa-bell text-lg lg:text-xl ${unreadCount > 0 ? 'group-hover:animate-swing' : ''}`}></i>
                 {unreadCount > 0 && (
                   <span className="absolute top-0 right-0 w-4 h-4 lg:w-5 lg:h-5 bg-rose-500 text-white text-[9px] lg:text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center animate-bounce-slow">
                     {unreadCount}
                   </span>
                 )}
               </button>

               {/* Notification Dropdown Container */}
               {showNotifications && (
                 <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-white dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200 z-50 ring-4 ring-slate-50/50 dark:ring-black/20">
                    {/* ... (Notification content remains the same) ... */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800 relative z-20">
                       <h3 className="font-bold text-lg text-slate-800 dark:text-white">Thông báo</h3>
                       <div className="flex gap-2">
                           {unreadCount > 0 && (
                             <button 
                               onClick={handleMarkAllRead}
                               className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center justify-center transition-colors"
                               title="Đánh dấu tất cả là đã đọc"
                             >
                                <i className="fa-solid fa-check-double text-xs"></i>
                             </button>
                           )}
                           {unreadCount > 0 && <span className="text-[10px] bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 px-3 py-1 rounded-full font-bold flex items-center border border-pink-200 dark:border-pink-800">{unreadCount} mới</span>}
                       </div>
                    </div>

                    <div className="relative h-96 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className={`absolute inset-0 overflow-y-auto p-4 transition-transform duration-300 ${selectedNotification ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
                           {notifications.length > 0 ? notifications.slice(0, 10).map(notif => {
                             const isScheduled = notif.scheduledAt > Date.now();
                             let cardClasses = "p-4 mb-3 rounded-3xl flex gap-4 relative transition-all duration-200 cursor-pointer border ";
                             if (isScheduled) {
                               cardClasses += "bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/20";
                             } else if (!notif.isRead) {
                               cardClasses += "bg-white dark:bg-slate-700 shadow-lg shadow-pink-100/50 dark:shadow-none border-pink-100 dark:border-pink-900 hover:scale-[1.02] z-10";
                             } else {
                               cardClasses += "bg-white/60 dark:bg-slate-800/60 border-transparent hover:bg-white dark:hover:bg-slate-700 hover:border-slate-200 hover:shadow-sm opacity-90";
                             }

                             return (
                               <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={cardClasses}>
                                  {isScheduled && (
                                    <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm border-2 border-white dark:border-slate-800 flex items-center gap-1 animate-bounce-slow">
                                       <i className="fa-solid fa-hourglass-half"></i> Chờ gửi
                                    </div>
                                  )}
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color} shadow-sm relative border-2 border-white dark:border-slate-600`}>
                                     <i className={`fa-solid ${notif.icon} text-lg`}></i>
                                     {!notif.isRead && !isScheduled && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-[3px] border-white dark:border-slate-700"></span>}
                                  </div>
                                  <div className="min-w-0 flex-1 py-0.5">
                                     <h4 className={`text-sm leading-tight mb-1 ${!notif.isRead && !isScheduled ? 'font-black text-slate-800 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'} truncate`}>{notif.title}</h4>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{notif.desc}</p>
                                     <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2 flex items-center gap-1">
                                        {isScheduled ? <i className="fa-regular fa-clock text-amber-500"></i> : <i className="fa-regular fa-clock"></i>}
                                        {new Date(notif.time).toLocaleString('vi-VN')}
                                     </p>
                                  </div>
                               </div>
                             );
                           }) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                               <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                  <i className="fa-regular fa-bell-slash text-3xl opacity-50"></i>
                               </div>
                               <p className="text-sm font-bold">Không có thông báo nào</p>
                             </div>
                           )}
                        </div>

                        <div className={`absolute inset-0 bg-white dark:bg-slate-800 z-10 p-6 flex flex-col transition-transform duration-300 ${selectedNotification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                           {selectedNotification && (
                             <>
                                <button onClick={() => setSelectedNotification(null)} className="self-start text-xs font-bold text-slate-500 hover:text-pink-500 mb-6 flex items-center bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
                                  <i className="fa-solid fa-arrow-left mr-2"></i> Quay lại
                                </button>
                                <div className="flex-1 overflow-y-auto pr-1">
                                  <div className="flex items-center gap-4 mb-6">
                                     <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shrink-0 ${selectedNotification.bg} ${selectedNotification.color} shadow-md border-4 border-slate-50 dark:border-slate-700`}>
                                        <i className={`fa-solid ${selectedNotification.icon} text-2xl`}></i>
                                     </div>
                                     <div>
                                        <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{selectedNotification.title}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            {selectedNotification.scheduledAt > Date.now() && (
                                                <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold border border-amber-200">Chưa gửi</span>
                                            )}
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                               {new Date(selectedNotification.time).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-700/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    {selectedNotification.desc}
                                  </div>
                                </div>
                             </>
                           )}
                        </div>
                    </div>

                    <div className="p-4 text-center border-t border-slate-100 dark:border-slate-700 relative z-20 bg-white dark:bg-slate-800">
                       <button onClick={() => { setShowNotifications(false); setShowAllNotifModal(true); }} className="text-xs font-bold text-slate-500 hover:text-pink-500 transition-colors flex items-center justify-center gap-2 w-full py-1">
                         Xem tất cả thông báo <i className="fa-solid fa-arrow-right"></i>
                       </button>
                    </div>
                 </div>
               )}
             </div>

             {/* Profile Area */}
             <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 pl-1 pr-1 sm:pl-2 sm:pr-4 py-1 sm:py-2 bg-white/60 dark:bg-slate-800/80 rounded-full border border-white dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95 group backdrop-blur-sm"
                >
                   <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-bold shadow-md border-2 border-white dark:border-slate-600 ${currentUser?.role === 'master' ? 'bg-gradient-to-tr from-slate-700 to-slate-900' : 'bg-gradient-to-tr from-pink-400 to-orange-400'}`}>
                      {currentUser?.email.substring(0, 1).toUpperCase()}
                   </div>
                   <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                        {currentUser?.role === 'master' ? 'Admin' : 'Khách'}
                      </p>
                   </div>
                   <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isProfileOpen && (
                  <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200 z-50">
                     <div className="p-5 bg-gradient-to-r from-pink-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-700 border-b border-slate-100 dark:border-slate-600 relative overflow-hidden">
                        <div className="absolute top-[-10px] right-[-10px] text-6xl text-white/40 dark:text-black/10 rotate-12">
                           <i className="fa-solid fa-user-circle"></i>
                        </div>
                        <p className="text-base font-black text-slate-800 dark:text-white truncate relative z-10">
                           {currentUser?.role === 'master' ? 'Bibi Admin' : `Bibi ${currentUser?.email.split('@')[0]}`}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate relative z-10">{currentUser?.email}</p>
                     </div>
                     <div className="p-2 space-y-1">
                        <button 
                          onClick={() => { setIsProfileOpen(false); setShowPasswordModal(true); }}
                          className="w-full text-left px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-3"
                        >
                           <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center">
                              <i className="fa-solid fa-key"></i>
                           </div>
                           Đổi mật khẩu
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors flex items-center gap-3"
                        >
                           <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center">
                              <i className="fa-solid fa-arrow-right-from-bracket"></i>
                           </div>
                           Đăng xuất
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full scroll-smooth p-4 lg:p-8 pt-0 no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {currentView === View.DASHBOARD && (
              <Dashboard 
                user={currentUser!} 
                initialSelectedUser={selectedCustomerIdForStats} 
              />
            )}
            {currentView === View.KNOWLEDGE_BASE && (
              <KnowledgeBase 
                userId={currentUser!.id}
                documents={documents} 
                onAddDocument={addDocument} 
                onDeleteDocument={deleteDocument} 
              />
            )}
            {currentView === View.CHAT_HISTORY && (
              <ChatHistory user={currentUser!} />
            )}
            {currentView === View.WIDGET_CONFIG && <WidgetPreview settings={settings} setSettings={updateSettings} />}
            {currentView === View.INTEGRATION && <Integration userId={currentUser!.id} />}
            {currentView === View.DEPLOYMENT_GUIDE && <DeploymentGuide />}
            {currentView === View.CUSTOMER_MANAGEMENT && currentUser?.role === 'master' && (
              <CustomerManagement onViewStats={handleViewCustomerStats} />
            )}
             {currentView === View.NOTIFICATION_MANAGER && currentUser?.role === 'master' && (
              <NotificationManager user={currentUser} />
            )}
          </div>
        </div>
      </main>

      {currentUser?.role !== 'master' && (
        <ChatWidget settings={settings} userId={currentUser!.id} />
      )}

      {/* ALL NOTIFICATIONS MODAL (Updated with Infinite Scroll & Mark All Read Button) */}
      {showAllNotifModal && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowAllNotifModal(false)}>
           <div 
             className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-0 relative animate-in fade-in zoom-in duration-300 border-[6px] border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh]"
             onClick={e => e.stopPropagation()}
           >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-xl flex items-center justify-center text-xl shadow-sm">
                     <i className="fa-solid fa-bell"></i>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Tất cả thông báo</h3>
                </div>
                <div className="flex items-center gap-2">
                   {/* Mark All Read Button in Modal */}
                   {unreadCount > 0 && (
                     <button 
                        onClick={handleMarkAllRead}
                        className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center justify-center transition-colors"
                        title="Đánh dấu tất cả là đã đọc"
                     >
                        <i className="fa-solid fa-check-double text-sm"></i>
                     </button>
                   )}
                   <button 
                     onClick={() => setShowAllNotifModal(false)}
                     className="w-10 h-10 bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                   >
                     <i className="fa-solid fa-xmark text-lg"></i>
                   </button>
                </div>
              </div>

              {/* Modal Body Container with Sliding Logic */}
              <div className="relative flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 min-h-[400px]">
                  {/* LIST VIEW SLIDER */}
                  <div 
                    className={`absolute inset-0 overflow-y-auto p-6 space-y-4 flex-1 scroll-smooth transition-transform duration-300 ease-out ${selectedNotification ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}
                    ref={notifModalScrollRef}
                    onScroll={handleNotifModalScroll}
                  >
                     {notifications.length > 0 ? (
                        notifications.slice(0, visibleNotifCount).map(notif => (
                           <div 
                              key={notif.id} 
                              onClick={() => handleNotificationClick(notif)}
                              className={`flex gap-4 p-5 rounded-[1.5rem] border transition-all cursor-pointer group ${
                                !notif.isRead 
                                ? 'bg-white dark:bg-slate-700 border-pink-200 dark:border-pink-900 shadow-md shadow-pink-50 dark:shadow-none hover:scale-[1.01]' 
                                : 'bg-white/60 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                              }`}
                           >
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color} shadow-sm text-xl relative border-2 border-white dark:border-slate-600 transition-transform group-hover:scale-110`}>
                                 <i className={`fa-solid ${notif.icon}`}></i>
                                 {!notif.isRead && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-[3px] border-white dark:border-slate-700"></span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-bold text-base truncate pr-2 ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{notif.title}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
                                      {new Date(notif.time).toLocaleString('vi-VN')}
                                    </span>
                                 </div>
                                 {/* Added line-clamp-2 to truncate long descriptions */}
                                 <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed line-clamp-2">{notif.desc}</p>
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="text-center py-20 text-slate-400">
                            <i className="fa-regular fa-bell-slash text-4xl mb-4"></i>
                            <p>Không có thông báo nào</p>
                        </div>
                     )}

                     {/* Loading / End Indicators */}
                     {notifications.length > visibleNotifCount && (
                        <div className="py-4 text-center">
                            <div className="inline-block w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin"></div>
                            <p className="text-xs font-bold text-slate-400 mt-2">Đang tải thêm...</p>
                        </div>
                     )}
                     
                     {notifications.length > 0 && notifications.length <= visibleNotifCount && (
                        <div className="text-center py-6">
                            <p className="text-sm font-bold text-slate-400">Bạn đã xem hết danh sách rồi nha! 🎉</p>
                        </div>
                     )}
                  </div>

                  {/* DETAIL VIEW SLIDER */}
                  <div className={`absolute inset-0 bg-white dark:bg-slate-800 p-6 flex flex-col transition-transform duration-300 ease-out overflow-hidden ${selectedNotification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                      {selectedNotification && (
                          <>
                            <button 
                                onClick={() => setSelectedNotification(null)} 
                                className="self-start text-xs font-bold text-slate-500 hover:text-pink-500 mb-6 flex items-center bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl transition-colors hover:bg-pink-50 dark:hover:bg-pink-900/30"
                            >
                                <i className="fa-solid fa-arrow-left mr-2"></i> Quay lại
                            </button>
                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shrink-0 ${selectedNotification.bg} ${selectedNotification.color} shadow-lg border-4 border-slate-50 dark:border-slate-700`}>
                                        <i className={`fa-solid ${selectedNotification.icon} text-3xl`}></i>
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedNotification.title}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            {selectedNotification.scheduledAt > Date.now() && (
                                                <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold border border-amber-200">Chưa gửi</span>
                                            )}
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                                                <i className="fa-regular fa-clock mr-1"></i>
                                                {new Date(selectedNotification.time).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-base font-medium text-slate-700 dark:text-slate-200 leading-loose bg-slate-50 dark:bg-slate-700/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    {selectedNotification.desc}
                                </div>
                            </div>
                          </>
                      )}
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* CUTE Change Password Modal (Moved from Sidebar) */}
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

    </div>
  );
};

export default App;
