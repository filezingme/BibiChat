
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import KnowledgeBase from './components/KnowledgeBase';
import WidgetConfig from './components/WidgetPreview'; 
import ChatWidget from './components/ChatWidget';
import Integration from './components/Integration';
import DeploymentGuide from './components/DeploymentGuide';
import CustomerManagement from './components/CustomerManagement';
import ChatHistory from './components/ChatHistory';
import NotificationManager from './components/NotificationManager'; 
import Leads from './components/Leads';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import CommunityChat from './components/CommunityChat'; // Import new component
import { TermsPage, PrivacyPage, ContactPage, DemoPage } from './components/LegalPages'; 
import { View, Document, WidgetSettings, User, Notification } from './types';
import { apiService } from './services/apiService';

type PublicViewType = 'landing' | 'login' | 'terms' | 'privacy' | 'contact' | 'demo';

const App: React.FC = () => {
  const [isEmbedMode, setIsEmbedMode] = useState(false); // New State for Embed Mode
  const [embedUserId, setEmbedUserId] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicView, setPublicView] = useState<PublicViewType>('landing'); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCustomerIdForStats, setSelectedCustomerIdForStats] = useState<string>('all');
  
  // State for direct chat targeting
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omnichat_theme') === 'dark';
    }
    return false;
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null); // Added ref for portal positioning
  const [visibleNotifCount, setVisibleNotifCount] = useState(5);
  
  // Unread Direct Messages Count
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null); // Ref for positioning portal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  
  // Offline Mode State
  const [isOffline, setIsOffline] = useState(false);

  const [settings, setSettings] = useState<WidgetSettings>({
    primaryColor: '#8b5cf6', 
    botName: 'Trợ lý AI',
    welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
    position: 'right',
    avatarUrl: 'https://picsum.photos/100/100'
  });
  
  // Refresh Key for ChatWidget
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);

  const viewNames: Record<View, string> = {
    [View.DASHBOARD]: 'Tổng quan',
    [View.KNOWLEDGE_BASE]: 'Kho tri thức',
    [View.WIDGET_CONFIG]: 'Cấu hình Widget',
    [View.ANALYTICS]: 'Phân tích',
    [View.INTEGRATION]: 'Mã nhúng',
    [View.DEPLOYMENT_GUIDE]: 'Hướng dẫn',
    [View.CUSTOMER_MANAGEMENT]: 'Khách hàng',
    [View.CHAT_HISTORY]: 'Lịch sử chat',
    [View.NOTIFICATION_MANAGER]: 'Quản lý thông báo',
    [View.LEADS]: 'Khách hàng tiềm năng',
    [View.DIRECT_MESSAGES]: 'Chat hỗ trợ'
  };

  useEffect(() => {
    // Check Database Connection Status
    apiService.checkHealth().then(status => {
        if (status.online) {
            console.log('%c✅ Database Connected Successfully!', 'color: #10b981; font-weight: bold; font-size: 14px; background: #ecfdf5; padding: 4px; border-radius: 4px;');
            setIsOffline(false);
        } else {
            console.log('%c⚠️ Unable to connect to Database. Switching to Offline Mode.', 'color: #f59e0b; font-weight: bold; font-size: 14px; background: #fffbeb; padding: 4px; border-radius: 4px;');
            setIsOffline(true);
        }
    });

    // Detect Embed Mode via URL params
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const userId = params.get('userId');

    if (mode === 'embed' && userId) {
        setIsEmbedMode(true);
        setEmbedUserId(userId);
        // Load settings for this user
        apiService.getUsersPaginated(1, 1, userId).then(res => {
             // We can't query specific user by ID easily with current API, 
             // but assuming we fetch user settings via a public endpoint would be better.
             // For now, we reuse the existing settings endpoint which is open enough.
             fetch(`https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app/api/settings/${userId}`)
                .then(r => r.json())
                .then(data => {
                    if(data) setSettings(data);
                });
        });
        return; // Stop further initialization
    }

    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('omnichat_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('omnichat_theme', 'light');
    }
  }, [darkMode]);

  // Embed Mode Render
  if (isEmbedMode && embedUserId) {
      return (
          <div className="bg-transparent h-screen w-full flex items-end justify-end">
             {/* We render a specialized ChatWidget that communicates with parent window via postMessage */}
             <StandaloneChatWidget settings={settings} userId={embedUserId} />
          </div>
      );
  }

  // --- Normal App Logic continues ---
  useEffect(() => {
    if(isEmbedMode) return; 

    // Check for Impersonation (Login As) Logic
    const params = new URLSearchParams(window.location.search);
    const impersonateId = params.get('impersonate');
    
    if (impersonateId) {
       localStorage.setItem('omnichat_user_id', impersonateId);
       localStorage.setItem('omnichat_user_role', 'user');
       window.location.href = window.location.origin;
       return;
    }

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
      // Logic for outside click is now handled by Portals backdrop
      if (profileRef.current && !profileRef.current.contains(event.target as Node) && profileButtonRef.current && !profileButtonRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  // Poll for Notifications and Unread Messages
  useEffect(() => {
    if (isLoggedIn && currentUser && !isEmbedMode) {
      loadNotifications();
      loadUnreadMessages(); // Initial load
      
      const interval = setInterval(() => {
          loadNotifications();
          loadUnreadMessages();
      }, 5000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoggedIn, currentUser?.id, isEmbedMode]);

  const loadUnreadMessages = async () => {
      if (currentUser) {
          const count = await apiService.getUnreadMessagesCount(currentUser.id);
          setUnreadMessagesCount(count);
      }
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
        if (visibleNotifCount < notifications.length) {
            setVisibleNotifCount(prev => prev + 5);
        }
    }
  };

  const toggleNotifications = () => {
      if (!showNotifications) {
          setVisibleNotifCount(5);
          setSelectedNotification(null);
      }
      setShowNotifications(!showNotifications);
  };

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

  // Handle direct chat from Customer Management
  const handleStartChat = (userId: string) => {
      setChatTargetId(userId);
      setCurrentView(View.DIRECT_MESSAGES);
  };

  // Calculate position for Profile Dropdown Portal
  const getDropdownStyle = () => {
      if (profileButtonRef.current) {
          const rect = profileButtonRef.current.getBoundingClientRect();
          return {
              top: rect.bottom + 12 + window.scrollY,
              right: window.innerWidth - rect.right,
          };
      }
      return { top: 0, right: 0 };
  };

  // Calculate position for Notification Dropdown Portal
  const getNotifDropdownStyle = () => {
      if (notifButtonRef.current) {
          const rect = notifButtonRef.current.getBoundingClientRect();
          return {
              top: rect.bottom + 12 + window.scrollY,
              right: window.innerWidth - rect.right, // align right edge
          };
      }
      return { top: 60, right: 10 };
  };

  if (!isLoggedIn) {
    if (publicView === 'terms') return <TermsPage onNavigate={setPublicView} />;
    if (publicView === 'privacy') return <PrivacyPage onNavigate={setPublicView} />;
    if (publicView === 'contact') return <ContactPage onNavigate={setPublicView} />;
    if (publicView === 'demo') return <DemoPage onNavigate={setPublicView} />;
    if (publicView === 'landing') return <LandingPage onNavigate={setPublicView} />;
    return (
      <>
        <div className="absolute top-4 left-4 z-50">
           <button onClick={() => setPublicView('landing')} className="px-4 py-2 bg-white/50 hover:bg-white rounded-xl text-sm font-bold text-slate-600 transition-all backdrop-blur-sm shadow-sm">
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
      {/* Offline Banner */}
      {isOffline && (
          <div className="absolute top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-1 text-xs font-bold shadow-md animate-in slide-in-from-top duration-300">
              <i className="fa-solid fa-wifi-slash mr-2"></i>
              Mất kết nối Database - Hệ thống đang sử dụng dữ liệu Offline trên trình duyệt.
          </div>
      )}

      {!darkMode && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
           <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      )}
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
        unreadMessagesCount={unreadMessagesCount}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="h-20 lg:h-24 flex items-center justify-between px-4 lg:px-8 relative z-40 shrink-0 transition-all duration-300">
          <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="lg:hidden w-10 h-10 lg:w-12 lg:h-12 shrink-0 bg-white/50 dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-pink-500 hover:text-pink-600 transition-colors backdrop-blur-sm"
            >
              <i className="fas fa-bars text-lg lg:text-xl"></i>
            </button>
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
             <button 
               onClick={() => setDarkMode(!darkMode)}
               className="flex w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/60 dark:bg-slate-800 border border-white dark:border-slate-700 shadow-sm items-center justify-center text-slate-600 dark:text-yellow-400 hover:scale-110 transition-transform backdrop-blur-sm shrink-0"
               title={darkMode ? "Chuyển sang sáng" : "Chuyển sang tối"}
             >
                <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'} text-lg lg:text-xl`}></i>
             </button>
             
             <div className="relative">
               <button 
                ref={notifButtonRef}
                onClick={toggleNotifications}
                className={`w-10 h-10 lg:w-12 lg:h-12 bg-white/60 dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center transition-all relative active:scale-95 group border border-white dark:border-slate-700 backdrop-blur-sm ${showNotifications ? 'bg-pink-100 text-pink-500 dark:bg-pink-900/30' : 'text-slate-500 dark:text-slate-300 hover:text-pink-500'}`}
               >
                 <i className={`fa-regular fa-bell text-lg lg:text-xl ${unreadCount > 0 ? 'animate-swing' : ''}`}></i>
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] lg:text-[10px] font-black rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center animate-bounce-slow shadow-sm px-1">
                     {unreadCount}
                   </span>
                 )}
               </button>

               {/* Notification Dropdown via Portal - Fix for z-index issues on mobile */}
               {showNotifications && createPortal(
                 <>
                 <div className="fixed inset-0 z-[99999] bg-transparent" onClick={() => setShowNotifications(false)}></div>
                 <div 
                    className="fixed w-[280px] sm:w-[320px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-[3px] border-white/60 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100000] ring-4 ring-pink-100/50 dark:ring-pink-900/20 origin-top-right"
                    style={getNotifDropdownStyle()}
                    ref={notifRef}
                 >
                    <div className="px-5 py-3 border-b border-slate-100/50 dark:border-slate-700/50 flex justify-between items-center bg-gradient-to-r from-white/50 to-pink-50/50 dark:from-slate-800/50 dark:to-slate-800/30 relative z-20">
                       <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                          <span className="w-7 h-7 bg-pink-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-none text-xs"><i className="fa-solid fa-bell"></i></span>
                          Thông báo
                       </h3>
                       <div className="flex gap-2 items-center">
                           {unreadCount > 0 && (
                             <button onClick={handleMarkAllRead} className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-[10px] font-bold text-slate-500 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-all border border-slate-200 dark:border-slate-600 shadow-sm"><i className="fa-solid fa-check-double"></i></button>
                           )}
                       </div>
                    </div>

                    <div className="relative h-[300px] bg-slate-50/50 dark:bg-slate-900/20">
                        <div className={`absolute inset-0 px-2 py-2 transition-transform duration-300 ${selectedNotification ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'} ${notifications.length > 0 ? 'overflow-y-auto scroll-smooth' : 'flex items-center justify-center'} [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors`} onScroll={handleDropdownScroll}>
                           {notifications.length > 0 ? (
                             <div className="space-y-2 pt-1 pb-4">
                               {notifications.slice(0, visibleNotifCount).map(notif => {
                                 const isScheduled = notif.scheduledAt > Date.now();
                                 const isRead = notif.isRead;
                                 let cardStyle = "relative p-3 rounded-[1.2rem] transition-all duration-300 cursor-pointer group flex items-start gap-3 border-2 ";
                                 if (isScheduled) cardStyle += "bg-amber-50/80 dark:bg-amber-900/10 border-dashed border-amber-300/60 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30";
                                 else if (!isRead) cardStyle += "bg-white dark:bg-slate-800 border-white dark:border-slate-700 shadow-[0_4px_15px_-4px_rgba(236,72,153,0.15)] dark:shadow-none hover:border-pink-200 dark:hover:border-pink-800 hover:shadow-lg hover:shadow-pink-100/50 transform hover:-translate-y-0.5 z-10";
                                 else cardStyle += "bg-white/40 dark:bg-slate-800/40 border-transparent hover:bg-white dark:hover:bg-slate-700 hover:border-slate-100 dark:hover:border-slate-600";

                                 return (
                                   <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={cardStyle}>
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color} shadow-sm border-2 border-white dark:border-slate-700 relative group-hover:rotate-6 transition-transform duration-300`}>
                                         <i className={`fa-solid ${notif.icon} text-base`}></i>
                                         {isScheduled ? (<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-sm"><i className="fa-solid fa-clock text-[7px] text-white"></i></span>) : !isRead && (<span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>)}
                                      </div>
                                      <div className="flex-1 min-w-0 pt-0.5">
                                         <div className="flex justify-between items-start gap-1 mb-0.5">
                                            <h4 className={`text-xs leading-snug truncate ${!isRead && !isScheduled ? 'font-black text-slate-800 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`}>{notif.title}</h4>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{new Date(notif.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                                         </div>
                                         <p className={`text-[11px] leading-relaxed line-clamp-2 ${!isRead ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>{notif.desc}</p>
                                      </div>
                                   </div>
                                 );
                               })}
                               {notifications.length > visibleNotifCount && <div className="py-2 text-center"><div className="w-5 h-5 mx-auto rounded-full border-2 border-pink-200 border-t-pink-500 animate-spin bg-white dark:bg-slate-800"></div><p className="text-[9px] font-bold text-slate-400 mt-1">Đang tải thêm...</p></div>}
                               {notifications.length > 0 && notifications.length <= visibleNotifCount && <div className="text-center py-4 opacity-50"><i className="fa-solid fa-check-circle text-lg text-slate-300 mb-1"></i><p className="text-[10px] font-bold text-slate-400">Đã hết rồi nha</p></div>}
                             </div>
                           ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-6">
                               <div className="relative mb-4"><div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center shadow-inner border-[4px] border-white dark:border-slate-800"><i className="fa-solid fa-box-open text-2xl text-slate-300 dark:text-slate-500"></i></div><div className="absolute -bottom-1 -right-1 text-lg animate-bounce delay-700">🍃</div></div>
                               <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">Hộp thư trống!</h4>
                               <p className="text-xs font-medium text-slate-400 dark:text-slate-500 max-w-[180px] leading-relaxed">Chưa có tin tức nào mới. Bạn quay lại sau nhé!</p>
                             </div>
                           )}
                        </div>
                        <div className={`absolute inset-0 z-20 flex flex-col transition-transform duration-300 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl ${selectedNotification ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
                           {selectedNotification && (
                             <div className="flex flex-col h-full">
                                <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                                   <button onClick={() => setSelectedNotification(null)} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-pink-500 transition-all flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600"><i className="fa-solid fa-arrow-left text-xs"></i></button>
                                   <span className="text-xs font-bold text-slate-500">Chi tiết thông báo</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors">
                                   <div className="flex items-start gap-4 mb-4">
                                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${selectedNotification.bg} ${selectedNotification.color} shadow-lg shadow-pink-100/50 dark:shadow-none border-[3px] border-white dark:border-slate-800`}><i className={`fa-solid ${selectedNotification.icon} text-2xl`}></i></div>
                                       <div className="flex-1 pt-1">
                                            <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight mb-2">{selectedNotification.title}</h4>
                                           <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-regular fa-clock text-slate-400"></i>{new Date(selectedNotification.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                                       </div>
                                   </div>
                                   <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative"><i className="fa-solid fa-quote-left absolute -top-2 -left-1 text-2xl text-slate-200 dark:text-slate-700"></i><p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed relative z-10">{selectedNotification.desc}</p></div>
                                </div>
                             </div>
                           )}
                        </div>
                    </div>
                 </div>
                 </>,
                 document.body
               )}
             </div>

             <div className="relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 pl-1 pr-1 sm:pl-2 sm:pr-4 py-1 sm:py-2 bg-white/60 dark:bg-slate-800/80 rounded-full border border-white dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95 group backdrop-blur-sm"
                >
                   <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-bold shadow-md border-2 border-white dark:border-slate-600 ${currentUser?.role === 'master' ? 'bg-gradient-to-tr from-slate-700 to-slate-900' : 'bg-gradient-to-tr from-pink-400 to-orange-400'}`}>
                      {currentUser?.email.substring(0, 1).toUpperCase()}
                   </div>
                   <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                        {currentUser?.role === 'master' ? 'Admin' : 'Thông tin Bibi'}
                      </p>
                   </div>
                   <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`}></i>
                </button>
                
                {/* Portal Profile Dropdown to Body to avoid Z-Index Issues */}
                {isProfileOpen && createPortal(
                  <>
                    <div className="fixed inset-0 z-[99999] bg-transparent" onClick={() => setIsProfileOpen(false)}></div>
                    <div 
                        className="fixed w-64 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200 z-[100000]"
                        style={getDropdownStyle()}
                        ref={profileRef}
                    >
                        <div className="p-5 bg-gradient-to-r from-pink-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-700 border-b border-slate-100 dark:border-slate-600 relative overflow-hidden">
                            <div className="absolute top-[-10px] right-[-10px] text-6xl text-white/40 dark:text-black/10 rotate-12"><i className="fa-solid fa-user-circle"></i></div>
                            <p className="text-base font-black text-slate-800 dark:text-white truncate relative z-10">{currentUser?.role === 'master' ? 'Bibi Admin' : `Bibi ${currentUser?.email.split('@')[0]}`}</p>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate relative z-10">{currentUser?.email}</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button onClick={() => { setIsProfileOpen(false); setShowPasswordModal(true); }} className="w-full text-left px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center"><i className="fa-solid fa-key"></i></div>Đổi mật khẩu</button>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center"><i className="fa-solid fa-arrow-right-from-bracket"></i></div>Đăng xuất</button>
                        </div>
                    </div>
                  </>,
                  document.body
                )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full scroll-smooth p-4 lg:p-8 pt-0 no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {currentView === View.DASHBOARD && <Dashboard user={currentUser!} initialSelectedUser={selectedCustomerIdForStats} />}
            {currentView === View.KNOWLEDGE_BASE && <KnowledgeBase userId={currentUser!.id} documents={documents} onAddDocument={addDocument} onDeleteDocument={deleteDocument} />}
            {currentView === View.CHAT_HISTORY && <ChatHistory user={currentUser!} />}
            {currentView === View.WIDGET_CONFIG && <WidgetConfig settings={settings} setSettings={updateSettings} user={currentUser!} onConfigSave={() => setWidgetRefreshKey(prev => prev + 1)} />}
            {currentView === View.LEADS && <Leads user={currentUser!} />}
            {currentView === View.INTEGRATION && <Integration userId={currentUser!.id} />}
            {currentView === View.DEPLOYMENT_GUIDE && <DeploymentGuide />}
            {currentView === View.CUSTOMER_MANAGEMENT && currentUser?.role === 'master' && <CustomerManagement onViewStats={handleViewCustomerStats} onStartChat={handleStartChat} />}
             {currentView === View.NOTIFICATION_MANAGER && currentUser?.role === 'master' && <NotificationManager user={currentUser} />}
             {currentView === View.DIRECT_MESSAGES && <CommunityChat user={currentUser!} initialChatUserId={chatTargetId} onClearTargetUser={() => setChatTargetId(null)} />}
          </div>
        </div>
      </main>

      {/* RENDER CHAT WIDGET ONLY FOR NON-MASTER USERS */}
      {currentUser?.role !== 'master' && (
        <ChatWidget key={widgetRefreshKey} settings={settings} userId={currentUser!.id} />
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in fade-in zoom-in duration-300 border-[6px] border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors z-20"><i className="fa-solid fa-xmark text-lg"></i></button>
            <div className="text-center mb-6">
               <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-900/40 dark:to-rose-900/40 text-rose-500 dark:text-rose-300 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl shadow-pink-200/50 dark:shadow-none border-4 border-white dark:border-slate-700 transform -rotate-12 hover:rotate-12 transition-transform duration-500"><i className="fa-solid fa-user-lock"></i></div>
               <h3 className="text-2xl font-black text-slate-800 dark:text-white">Bảo mật tài khoản</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Đổi mật khẩu định kỳ cho an toàn nha!</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
               {passwordMsg.text && (<div className={`p-4 rounded-2xl text-sm font-bold flex items-center animate-in slide-in-from-top-2 ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}><i className={`fa-solid ${passwordMsg.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'} mr-2 text-lg`}></i>{passwordMsg.text}</div>)}
               <div className="space-y-4">
                 <div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors"><i className="fa-solid fa-key"></i></div><input type="password" required className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500 rounded-2xl text-sm font-bold focus:outline-none transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-black/20" placeholder="Mật khẩu cũ" value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} /></div>
                 <div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors"><i className="fa-solid fa-lock"></i></div><input type="password" required className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500 rounded-2xl text-sm font-bold focus:outline-none transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-black/20" placeholder="Mật khẩu mới (>= 6 ký tự)" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} /></div>
                 <div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors"><i className="fa-solid fa-shield-halved"></i></div><input type="password" required className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500 rounded-2xl text-sm font-bold focus:outline-none transition-all text-slate-700 dark:text-slate-200 placeholder-Nhập lại mật khẩu mới" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} /></div>
               </div>
               <button type="submit" className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl font-black shadow-xl shadow-pink-200 dark:shadow-none transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-base group"><span>Cập nhật ngay</span><i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Specialized Standalone Widget Component for Embed Mode
const StandaloneChatWidget: React.FC<{ settings: WidgetSettings, userId: string }> = ({ settings, userId }) => {
    // This is essentially a stripped down version of ChatWidget that communicates window size changes
    // to the parent window via postMessage
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        // Communicate state change to parent window (widget.js)
        window.parent.postMessage(isOpen ? 'bibichat-open' : 'bibichat-close', '*');
        
        // Initial position sync (optional if we want to support left/right via config)
        window.parent.postMessage({ type: 'bibichat-position', position: settings.position }, '*');
    }, [isOpen, settings.position]);

    return (
        <div className="h-full w-full flex flex-col justify-end items-end p-2 sm:p-4 overflow-hidden">
            {isOpen && (
                <div className="w-full h-full flex flex-col relative z-20 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <ChatWidget settings={settings} userId={userId} forceOpen={true} onClose={() => setIsOpen(false)} isEmbed={true} />
                </div>
            )}
            {!isOpen && (
                 <button 
                    onClick={() => setIsOpen(true)} 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl transition-all hover:scale-110 active:scale-95 duration-300 relative group z-20" 
                    style={{ backgroundColor: settings.primaryColor }}
                >
                    <span className="absolute inset-0 rounded-full bg-white opacity-20 group-hover:animate-ping"></span>
                    <i className="fa-solid fa-comment-dots"></i>
                </button>
            )}
        </div>
    );
};

export default App;