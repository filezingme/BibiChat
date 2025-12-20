import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface Props {
  user: User;
}

const initialIcons = [
  { class: 'fa-bell', label: 'Chuông' },
  { class: 'fa-gift', label: 'Quà' },
  { class: 'fa-bolt', label: 'Sét' },
  { class: 'fa-heart', label: 'Tim' },
  { class: 'fa-bullhorn', label: 'Loa' },
  { class: 'fa-star', label: 'Sao' },
  { class: 'fa-triangle-exclamation', label: 'Cảnh báo' },
  { class: 'fa-circle-info', label: 'Thông tin' },
  { class: 'fa-check-circle', label: 'Hoàn tất' },
  { class: 'fa-fire', label: 'Hot' },
  // Extended Icons
  { class: 'fa-envelope', label: 'Thư' },
  { class: 'fa-camera', label: 'Ảnh' },
  { class: 'fa-gamepad', label: 'Game' },
  { class: 'fa-music', label: 'Nhạc' },
  { class: 'fa-video', label: 'Video' },
  { class: 'fa-shop', label: 'Shop' },
  { class: 'fa-cart-shopping', label: 'Giỏ hàng' },
  { class: 'fa-truck-fast', label: 'Ship' },
  { class: 'fa-award', label: 'Huy chương' },
  { class: 'fa-medal', label: 'Medal' },
  { class: 'fa-trophy', label: 'Cúp' },
  { class: 'fa-crown', label: 'Vương miện' },
  { class: 'fa-gem', label: 'Kim cương' },
  { class: 'fa-wand-magic', label: 'Phép thuật' },
  { class: 'fa-ghost', label: 'Ma' },
  { class: 'fa-rocket', label: 'Tên lửa' },
  { class: 'fa-plane', label: 'Máy bay' },
  { class: 'fa-umbrella-beach', label: 'Du lịch' },
];

const colors = [
  { text: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { text: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { text: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { text: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { text: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  { text: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  // Extended Colors
  { text: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  { text: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  { text: 'text-lime-500', bg: 'bg-lime-100 dark:bg-lime-900/30' },
  { text: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
  { text: 'text-slate-500', bg: 'bg-slate-200 dark:bg-slate-700' },
  { text: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
];

const targetOptions = [
  { value: 'all', label: 'Tất cả mọi người', icon: 'fa-users' },
  { value: 'admin', label: 'Chỉ Admin (Test)', icon: 'fa-user-shield' }
];

const NotificationManager: React.FC<Props> = ({ user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // AI Loading State
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  
  // Icon List State (to support dynamic AI additions)
  const [iconList, setIconList] = useState(initialIcons);
  const [selectedIcon, setSelectedIcon] = useState('fa-bell');
  
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [targetUser, setTargetUser] = useState('all');
  
  // Schedule Logic Changes
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('');

  // Dropdown State
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTargetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hàm xử lý đóng modal và reset form
  // Tách ra để dùng chung cho cả sự kiện click và timeout
  const handleCloseSuccess = () => {
    setShowSuccess(false);
    // Reset form
    setTitle('');
    setDesc('');
    setScheduleTime('');
    setSendImmediately(true);
  };

  // Effect để tự động đóng sau 2.5s
  // Sử dụng useEffect giúp clear timeout nếu user tự click đóng trước đó
  // Tránh việc reset form 2 lần (gây mất dữ liệu nếu user đang nhập mới)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showSuccess) {
        timer = setTimeout(() => {
            handleCloseSuccess();
        }, 2500);
    }
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const handleSmartIcon = async () => {
    if (!title && !desc) return;
    setIsAiLoading(true);
    // Combine title and desc for better context, prioritizing title
    const context = `Tiêu đề: ${title}. Nội dung: ${desc}`;
    try {
        const suggested = await apiService.suggestIcon(context);
        
        // Clean up suggestion just in case
        let iconClass = suggested.trim();
        if (!iconClass.startsWith('fa-')) iconClass = 'fa-' + iconClass.replace(/^fa\s/, '');

        // Add to list if not present so it shows as selected
        if (!iconList.find(ic => ic.class === iconClass)) {
            setIconList(prev => [{ class: iconClass, label: 'Gợi ý AI' }, ...prev]);
        }
        
        setSelectedIcon(iconClass);
    } catch (e) {
        console.error("AI suggest error", e);
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc) return;

    setIsSubmitting(true);

    const scheduledTimestamp = (!sendImmediately && scheduleTime) ? new Date(scheduleTime).getTime() : Date.now();

    const newNotif = {
      title,
      desc,
      icon: selectedIcon,
      color: selectedColor.text,
      bg: selectedColor.bg,
      userId: targetUser,
      scheduledAt: scheduledTimestamp
    };

    await apiService.createSystemNotification(newNotif);
    
    // Simulate delay for effect
    await new Promise(r => setTimeout(r, 1000));

    setShowSuccess(true); 
    // Không cần setTimeout ở đây nữa, useEffect sẽ lo việc đó
    
    setIsSubmitting(false);
  };

  const selectedTargetLabel = targetOptions.find(opt => opt.value === targetUser);

  return (
    <>
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-lg shadow-indigo-50/50 dark:shadow-none">
          <div className="flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-300 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-bell"></i>
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Quản lý Thông báo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Gửi tin nhắn cute đến người dùng</p>
              </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Create Form (Expanded to 8 columns) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 h-fit">
             <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <i className="fa-solid fa-pen-nib text-pink-500"></i> Soạn thông báo mới
             </h3>
             
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-2">Tiêu đề</label>
                       <div className="relative">
                          <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="VD: Bảo trì hệ thống..." 
                            className="w-full pl-5 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:border-indigo-500 font-bold text-sm text-slate-800 dark:text-white outline-none transition-all"
                          />
                          <button 
                            type="button" 
                            onClick={handleSmartIcon}
                            title="AI Chọn icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 flex items-center justify-center transition-colors"
                            disabled={isAiLoading || !title}
                          >
                             {isAiLoading ? <i className="fa-solid fa-circle-notch animate-spin text-xs"></i> : <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>}
                          </button>
                       </div>
                    </div>
                    
                    {/* Target Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-2">Gửi tới ai?</label>
                      <button 
                        type="button"
                        onClick={() => setIsTargetDropdownOpen(!isTargetDropdownOpen)}
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl font-bold text-xs text-slate-700 dark:text-slate-200 outline-none flex items-center justify-between hover:border-indigo-400 transition-all h-[52px]"
                      >
                         <span className="flex items-center gap-2">
                            <i className={`fa-solid ${selectedTargetLabel?.icon} text-indigo-500`}></i>
                            {selectedTargetLabel?.label}
                         </span>
                         <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isTargetDropdownOpen ? 'rotate-180' : ''}`}></i>
                      </button>

                      {isTargetDropdownOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-600 rounded-2xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in duration-200">
                           {targetOptions.map(opt => (
                             <div 
                               key={opt.value}
                               onClick={() => { setTargetUser(opt.value); setIsTargetDropdownOpen(false); }}
                               className={`px-4 py-3 text-xs font-bold cursor-pointer flex items-center gap-3 transition-colors ${targetUser === opt.value ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                             >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${targetUser === opt.value ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                   <i className={`fa-solid ${opt.icon}`}></i>
                                </div>
                                {opt.label}
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-2">Nội dung</label>
                   <textarea 
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={3}
                      placeholder="Nhập nội dung chi tiết..." 
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:border-indigo-500 font-medium text-sm text-slate-800 dark:text-white outline-none transition-all resize-none"
                   />
                </div>

                {/* Styled Date Picker with Toggle */}
                <div>
                    <div className="flex justify-between items-center mb-2 ml-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Thời gian gửi</label>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Toggle Send Immediately */}
                        <div 
                        onClick={() => setSendImmediately(!sendImmediately)}
                        className={`flex-1 cursor-pointer flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${sendImmediately ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:border-emerald-200'}`}
                        >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${sendImmediately ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                            {sendImmediately && <i className="fa-solid fa-check text-[10px]"></i>}
                        </div>
                        <span className={`text-xs font-bold ${sendImmediately ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>Gửi ngay lập tức</span>
                        </div>

                        {/* Date Input - Shows only if not immediate */}
                        <div className={`flex-1 transition-all duration-300 ${sendImmediately ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="relative">
                            <input 
                                type="datetime-local" 
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-600 rounded-2xl font-bold text-xs text-indigo-600 dark:text-indigo-300 outline-none focus:border-indigo-400 transition-all"
                                disabled={sendImmediately}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 bg-white dark:bg-slate-900 pl-2">
                                <i className="fa-regular fa-calendar-days"></i>
                            </span>
                        </div>
                        </div>
                    </div>
                </div>

                {/* Icon Selector */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-2">Chọn biểu tượng</label>
                   <div className="flex flex-wrap gap-3">
                      {iconList.map((ic) => (
                         <button 
                           key={ic.class}
                           type="button"
                           onClick={() => setSelectedIcon(ic.class)}
                           className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedIcon === ic.class ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                           title={ic.label}
                         >
                            <i className={`fa-solid ${ic.class}`}></i>
                         </button>
                      ))}
                   </div>
                </div>
                
                 {/* Color Selector */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-2">Chọn màu sắc</label>
                   <div className="flex flex-wrap gap-3">
                      {colors.map((c, i) => (
                         <button 
                           key={i}
                           type="button"
                           onClick={() => setSelectedColor(c)}
                           className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedColor.text === c.text ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : ''} ${c.bg} ${c.text}`}
                         >
                            <i className="fa-solid fa-circle text-xs"></i>
                         </button>
                      ))}
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                   {isSubmitting ? (
                     <>
                        <i className="fa-solid fa-circle-notch animate-spin"></i>
                        Đang gửi...
                     </>
                   ) : (
                     <>
                        <i className="fa-solid fa-paper-plane"></i> 
                        {(!sendImmediately && scheduleTime) ? 'Lên lịch gửi' : 'Gửi thông báo ngay'}
                     </>
                   )}
                </button>
             </form>
          </div>

          {/* Right Column: Creative Center (Replaced History) - Taking 4 columns now */}
          <div className="lg:col-span-4 space-y-8">
             {/* Phone Mockup Preview - Sticky */}
             <div className="sticky top-6">
                <div className="bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-800 relative max-w-[320px] mx-auto overflow-hidden">
                   {/* Notch & Top Bar */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                   <div className="absolute top-2 right-6 w-12 h-3 flex gap-1 justify-end z-20">
                      <div className="w-4 h-full bg-slate-700 rounded-sm"></div>
                      <div className="w-3 h-full bg-slate-700 rounded-sm"></div>
                   </div>

                   {/* Screen Content */}
                   <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-[500px] rounded-[2.2rem] overflow-hidden relative">
                      {/* Wallpaper Decor */}
                      <div className="absolute inset-0 opacity-30">
                         <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-pink-400 rounded-full blur-2xl"></div>
                         <div className="absolute bottom-[-20px] left-[-20px] w-60 h-60 bg-blue-400 rounded-full blur-3xl"></div>
                      </div>

                      {/* Time & Date */}
                      <div className="text-center pt-12 text-white/90">
                         <div className="text-5xl font-thin tracking-tight">{new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</div>
                         <div className="text-xs font-bold mt-1 opacity-70">{new Date().toLocaleDateString('vi-VN', {weekday: 'long', day: 'numeric', month: 'long'})}</div>
                      </div>

                      {/* Notification Card */}
                      <div className="mt-8 px-4 animate-in slide-in-from-bottom-4 duration-700">
                         <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                               <div className="w-5 h-5 bg-gradient-to-tr from-pink-500 to-violet-500 rounded-md flex items-center justify-center text-white text-[10px]">
                                  <i className="fa-solid fa-robot"></i>
                               </div>
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">BibiChat • Vừa xong</span>
                            </div>
                            <div className="flex gap-3">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedColor.bg} ${selectedColor.text}`}>
                                  <i className={`fa-solid ${selectedIcon} text-lg`}></i>
                               </div>
                               <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-black text-slate-800 truncate">{title || 'Tiêu đề ở đây...'}</h4>
                                  <p className="text-xs text-slate-600 mt-1 leading-snug line-clamp-2">{desc || 'Nội dung thông báo sẽ hiển thị như thế này trên điện thoại của khách hàng nha!'}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                      
                      {/* Swipe Indicator */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/50 rounded-full"></div>
                   </div>
                </div>

                {/* Tips Card */}
                <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-700 p-6 rounded-[2.5rem] border border-amber-100 dark:border-slate-600 relative overflow-hidden group">
                   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-200/50 dark:bg-slate-600 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                   <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2 relative z-10">
                      <i className="fa-solid fa-lightbulb text-xl animate-pulse"></i> Bí kíp của Bibi
                   </h4>
                   <ul className="space-y-3 text-xs font-bold text-slate-600 dark:text-slate-300 relative z-10">
                      <li className="flex items-start gap-2">
                         <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5"></span>
                         Thêm Emoji <span className="inline-block animate-bounce">✨</span> giúp tăng 20% tỷ lệ click đó nha!
                      </li>
                      <li className="flex items-start gap-2">
                         <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5"></span>
                         Thông báo ngắn gọn (dưới 50 từ) sẽ dễ đọc hơn trên điện thoại.
                      </li>
                      <li className="flex items-start gap-2">
                         <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5"></span>
                         Gửi vào khung giờ vàng (9h sáng hoặc 8h tối) để tiếp cận nhiều người nhất.
                      </li>
                   </ul>
                </div>
             </div>
          </div>
       </div>
    </div>
    
    {/* Success Overlay - Rendered via Portal */}
    {showSuccess && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
          onClick={handleCloseSuccess} // Click backdrop to close
        >
          <div 
            className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center animate-in zoom-in duration-300 border-[6px] border-white dark:border-slate-700 cursor-default"
            onClick={(e) => e.stopPropagation()} // Prevent close on content click
          >
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-check text-4xl text-emerald-500 animate-bounce"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">Thành công!</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">Thông báo đã được gửi đi nha.</p>
          </div>
        </div>,
        document.body
    )}
    </>
  );
};

export default NotificationManager;