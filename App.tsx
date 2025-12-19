
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
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { TermsPage, PrivacyPage, ContactPage, DemoPage } from './components/LegalPages'; // Import trang mới
import { View, Document, WidgetSettings, User } from './types';
import { apiService } from './services/apiService';

// Định nghĩa kiểu cho trang Public
type PublicViewType = 'landing' | 'login' | 'terms' | 'privacy' | 'contact' | 'demo';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicView, setPublicView] = useState<PublicViewType>('landing'); // State quản lý trang Public
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
  const [selectedNotification, setSelectedNotification] = useState<any>(null); // State cho thông báo đang xem
  const [showAllNotifModal, setShowAllNotifModal] = useState(false); // State cho modal xem tất cả
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Fake Notifications Data - Cute & Vibrant
  const notifications = [
    { id: 1, title: 'Bé AI đã học xong', desc: 'Dữ liệu "Chính sách đổi trả" đã được nạp thành công vào bộ nhớ. Bây giờ mình có thể trả lời khách hàng về vấn đề này rồi nha!', time: '2 giờ trước', icon: 'fa-graduation-cap', color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { id: 2, title: 'Hệ thống an toàn', desc: 'Vừa có đợt kiểm tra bảo mật định kỳ. Dữ liệu của bạn được bảo vệ tuyệt đối an toàn với mã hóa 2 lớp.', time: '5 giờ trước', icon: 'fa-shield-heart', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { id: 3, title: 'Có khách ghé thăm', desc: 'Hệ thống phát hiện một lượng truy cập lớn bất thường từ khu vực Hà Nội. Có vẻ chiến dịch quảng cáo của bạn đang hiệu quả đó!', time: '1 ngày trước', icon: 'fa-map-pin', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { id: 4, title: 'Chào mừng bạn', desc: 'Chào mừng bạn quay trở lại làm việc. Chúc bạn một ngày làm việc thật năng suất và vui vẻ nhé! ✨', time: '2 ngày trước', icon: 'fa-sun', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  const [settings, setSettings] = useState<WidgetSettings>({
    primaryColor: '#8b5cf6', // Violet default
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
    [View.CHAT_HISTORY]: 'Lịch sử chat'
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
      // If user is already logged in, skip public pages
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
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setSelectedNotification(null); // Reset selection when closing
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  const handleLoginSuccess = async (user: User) => {
    setIsLoggedIn(true);
    setPublicView('landing'); // Reset to landing for next logout
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
    setPublicView('landing'); // Return to landing on logout
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

  // --- RENDER LOGIC CHO CÁC TRANG PUBLIC ---
  if (!isLoggedIn) {
    if (publicView === 'terms') return <TermsPage onNavigate={setPublicView} />;
    if (publicView === 'privacy') return <PrivacyPage onNavigate={setPublicView} />;
    if (publicView === 'contact') return <ContactPage onNavigate={setPublicView} />;
    if (publicView === 'demo') return <DemoPage onNavigate={setPublicView} />;
    
    // Mặc định là Landing
    if (publicView === 'landing') {
        return <LandingPage onNavigate={setPublicView} />;
    }

    // Login View
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

  // --- RENDER MAIN APP (LOGGED IN) ---
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
        <header className="h-24 flex items-center justify-between px-8 z-30 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden w-12 h-12 bg-white/50 dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-pink-500 hover:text-pink-600 transition-colors backdrop-blur-sm">
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-sm">
                {viewNames[currentView]}
              </h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 hidden sm:block">
                {currentUser?.role === 'master' ? '🚀 Control Center' : '✨ Dashboard Doanh Nghiệp'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Dark Mode Toggle */}
             <button 
               onClick={() => setDarkMode(!darkMode)}
               className="w-12 h-12 rounded-full bg-white/60 dark:bg-slate-800 border border-white dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-yellow-400 hover:scale-110 transition-transform backdrop-blur-sm"
               title={darkMode ? "Chuyển sang sáng" : "Chuyển sang tối"}
             >
                <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
             </button>
             
             {/* Notification Bell */}
             <div className="relative" ref={notifRef}>
               <button 
                onClick={() => { setShowNotifications(!showNotifications); setSelectedNotification(null); }}
                className="w-12 h-12 bg-white/60 dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-pink-500 dark:hover:text-pink-400 hover:scale-110 transition-all relative active:scale-95 group border border-white dark:border-slate-700 backdrop-blur-sm"
               >
                 <i className="fa-regular fa-bell text-xl group-hover:animate-swing"></i>
                 <span className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
               </button>

               {/* Notification Dropdown Container */}
               {showNotifications && (
                 <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-white dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200 z-50">
                    
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800 relative z-20">
                       <h3 className="font-bold text-base text-slate-800 dark:text-white">Thông báo</h3>
                       {!selectedNotification && <span className="text-[10px] bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 px-3 py-1 rounded-full font-bold">Mới nhất</span>}
                    </div>

                    {/* Content Area */}
                    <div className="relative h-80">
                        {/* List View */}
                        <div className={`absolute inset-0 overflow-y-auto p-2 transition-transform duration-300 ${selectedNotification ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
                           {notifications.map(notif => (
                             <div 
                               key={notif.id} 
                               onClick={() => setSelectedNotification(notif)}
                               className="p-3 mb-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors cursor-pointer group"
                             >
                                <div className="flex gap-4">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color} shadow-sm`}>
                                      <i className={`fa-solid ${notif.icon} text-lg`}></i>
                                   </div>
                                   <div className="min-w-0">
                                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-pink-500 transition-colors truncate">{notif.title}</h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{notif.desc}</p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{notif.time}</p>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>

                        {/* Detail View (Overlay) */}
                        <div className={`absolute inset-0 bg-white dark:bg-slate-800 z-10 p-5 flex flex-col transition-transform duration-300 ${selectedNotification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                           {selectedNotification && (
                             <>
                                <button 
                                  onClick={() => setSelectedNotification(null)}
                                  className="self-start text-xs font-bold text-slate-500 hover:text-pink-500 mb-4 flex items-center bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg"
                                >
                                  <i className="fa-solid fa-arrow-left mr-2"></i> Quay lại
                                </button>
                                
                                <div className="flex-1 overflow-y-auto pr-1">
                                  <div className="flex items-center gap-3 mb-4">
                                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${selectedNotification.bg} ${selectedNotification.color}`}>
                                        <i className={`fa-solid ${selectedNotification.icon} text-2xl`}></i>
                                     </div>
                                     <div>
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{selectedNotification.title}</h4>
                                        <p className="text-xs text-slate-400 font-bold mt-1">{selectedNotification.time}</p>
                                     </div>
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    {selectedNotification.desc}
                                  </div>
                                </div>
                             </>
                           )}
                        </div>
                    </div>

                    <div className="p-3 text-center border-t border-slate-50 dark:border-slate-700 relative z-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                       <button 
                         onClick={() => { setShowNotifications(false); setShowAllNotifModal(true); }}
                         className="text-xs font-bold text-pink-500 hover:text-pink-700 dark:hover:text-pink-400 hover:underline"
                       >
                         Xem tất cả
                       </button>
                    </div>
                 </div>
               )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full scroll-smooth p-6 lg:p-8 pt-0 no-scrollbar">
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
          </div>
        </div>

        {currentUser?.role !== 'master' && (
          <div className="fixed bottom-6 right-6 z-50">
            <ChatWidget settings={settings} userId={currentUser!.id} />
          </div>
        )}
      </main>

      {/* ALL NOTIFICATIONS MODAL */}
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
                <button 
                  onClick={() => setShowAllNotifModal(false)}
                  className="w-10 h-10 bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-4">
                 {notifications.map(notif => (
                   <div key={notif.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-pink-200 dark:hover:border-slate-500 transition-colors">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color} shadow-sm text-xl`}>
                         <i className={`fa-solid ${notif.icon}`}></i>
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-800 dark:text-white">{notif.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">{notif.time}</span>
                         </div>
                         <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed">{notif.desc}</p>
                      </div>
                   </div>
                 ))}
                 <div className="text-center py-6">
                    <p className="text-sm font-bold text-slate-400">Bạn đã xem hết thông báo rồi nha! 🎉</p>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;
