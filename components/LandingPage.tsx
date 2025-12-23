
import React, { useState, useEffect } from 'react';

type PageType = 'landing' | 'login' | 'terms' | 'privacy' | 'contact' | 'demo';

interface Props {
  onNavigate: (page: PageType) => void;
}

const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const SERVER_URL = process.env.SERVER_URL || "https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-pink-100 selection:text-pink-600 overflow-x-hidden">
      {/* Navbar - Absolute on mobile to scroll with page, Fixed on desktop */}
      <nav className="absolute lg:fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-pink-400 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-200 group-hover:rotate-12 transition-transform duration-300">
              <i className="fa-solid fa-comment-dots text-2xl sm:text-3xl"></i>
            </div>
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-pink-600 transition-all">
              Bibi<span className="text-pink-500 group-hover:text-current">Chat</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Hotline Badge - Resized to match CTA button height */}
            <a href="tel:0979116118" className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-base hover:bg-emerald-100 transition-all border-2 border-emerald-100 hover:-translate-y-0.5 active:scale-95 group shadow-sm">
               <i className="fa-solid fa-phone-volume animate-tada mr-1"></i>
               0979.116.118
            </a>

            {/* Mobile: Simple Icon Button for Login */}
            <button 
              onClick={() => onNavigate('login')}
              className="sm:hidden w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full hover:bg-pink-50 hover:text-pink-500 transition-colors"
            >
              <i className="fa-solid fa-right-to-bracket text-lg"></i>
            </button>

            {/* Desktop: Sleek CTA Button (Resized) */}
            <button 
              onClick={() => onNavigate('login')}
              className="hidden sm:flex group relative px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-bold text-base shadow-md hover:shadow-pink-400/40 hover:-translate-y-0.5 transition-all active:scale-95 items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-out -skew-x-12 -translate-x-full"></div>
              <span>Dùng thử ngay</span>
              <i className="fa-solid fa-wand-magic-sparkles text-sm group-hover:rotate-12 transition-transform"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Adjusted padding top for new navbar height */}
      <section className="pt-32 sm:pt-40 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Decor blobs */}
        <div className="absolute top-20 right-[-10%] w-[30rem] h-[30rem] bg-pink-200/40 rounded-full blur-3xl -z-10 animate-blob"></div>
        <div className="absolute top-40 left-[-10%] w-[25rem] h-[25rem] bg-violet-200/40 rounded-full blur-3xl -z-10 animate-blob animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-pink-50 text-pink-600 rounded-full font-bold text-sm border border-pink-100 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-700">
              <span className="w-2 h-2 bg-pink-500 rounded-full mr-2 animate-pulse"></span>
              Trợ lý AI thế hệ mới #1
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
              CSKH tự động <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">Siêu đáng yêu</span>
            </h1>
            <p className="text-base sm:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Biến website của bạn trở nên sống động với BibiChat. Tự động trả lời, hỗ trợ 24/7 và cực kỳ thân thiện. Cài đặt chỉ trong 30 giây!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={() => onNavigate('login')}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-rocket"></i>
                Bắt đầu miễn phí
              </button>
              <button 
                onClick={() => onNavigate('demo')}
                className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl font-bold text-lg hover:border-pink-200 hover:text-pink-600 hover:bg-pink-50 transition-all flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-play"></i>
                Xem Demo
              </button>
            </div>
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-2 text-sm font-bold text-slate-400">
              <i className="fa-solid fa-check text-emerald-500"></i> Không cần thẻ tín dụng
              <span className="mx-2">•</span>
              <i className="fa-solid fa-check text-emerald-500"></i> Hủy bất kỳ lúc nào
            </div>
            
            {/* Mobile Phone Number */}
            <div className="lg:hidden mt-4">
               <a href="tel:0979116118" className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-lg hover:bg-emerald-100 transition-colors border border-emerald-100 shadow-sm">
                  <i className="fa-solid fa-phone-volume animate-tada"></i>
                  0979.116.118
               </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-full">
            <div className="relative z-10 bg-white p-4 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 animate-in zoom-in duration-700">
               {/* Mockup Header */}
               <div className="flex items-center gap-3 mb-4 px-2">
                 <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                   <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                   <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                 </div>
                 <div className="flex-1 bg-slate-50 h-6 rounded-lg mx-2"></div>
               </div>
               {/* Mockup Chat */}
               <div className="space-y-4 bg-slate-50 rounded-[2rem] p-6 h-[400px] flex flex-col">
                  <div className="flex items-end gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-violet-500 rounded-full flex items-center justify-center text-white shadow-md">
                      <i className="fa-solid fa-robot"></i>
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 text-sm font-medium text-slate-700">
                      Chào bạn! Mình là Bibi, mình có thể giúp gì cho bạn hôm nay nè? ✨
                    </div>
                  </div>
                  <div className="flex items-end gap-3 justify-end">
                    <div className="bg-pink-500 p-4 rounded-2xl rounded-br-none shadow-md text-sm font-medium text-white">
                      Shop mình mở cửa đến mấy giờ vậy ạ?
                    </div>
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                      <i className="fa-solid fa-user"></i>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-violet-500 rounded-full flex items-center justify-center text-white shadow-md">
                      <i className="fa-solid fa-robot"></i>
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 text-sm font-medium text-slate-700">
                      Dạ shop mở cửa từ 8:00 sáng đến 10:00 tối tất cả các ngày trong tuần ạ! 🥰
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-2 bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-500"><i className="fa-solid fa-plus"></i></div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full"></div>
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white"><i className="fa-solid fa-paper-plane text-xs"></i></div>
                  </div>
               </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-10 -right-10 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce duration-[3000ms]">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><i className="fa-solid fa-bolt"></i></div>
              <div>
                <p className="text-xs font-bold text-slate-400">Tốc độ</p>
                <p className="font-bold text-slate-800">Phản hồi 0.1s</p>
              </div>
            </div>
            <div className="absolute top-1/2 -left-12 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce duration-[4000ms]">
               <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><i className="fa-solid fa-brain"></i></div>
               <div>
                 <p className="text-xs font-bold text-slate-400">Thông minh</p>
                 <p className="font-bold text-slate-800">Học từ tài liệu</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-4">Tại sao chọn <span className="text-pink-500">BibiChat?</span></h2>
            <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Không chỉ là Chatbot, BibiChat là người bạn đồng hành giúp doanh nghiệp của bạn chuyên nghiệp hơn.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Huấn luyện dễ dàng', desc: 'Chỉ cần upload file (PDF, Word, Text), BibiChat sẽ tự học và trả lời chính xác.', icon: 'fa-graduation-cap', color: 'text-indigo-500', bg: 'bg-indigo-100' },
              { title: 'Tùy biến giao diện', desc: 'Đổi màu sắc, logo, lời chào để phù hợp với thương hiệu của bạn.', icon: 'fa-palette', color: 'text-pink-500', bg: 'bg-pink-100' },
              { title: 'Báo cáo chi tiết', desc: 'Theo dõi hiệu suất, số lượng câu hỏi và mức độ hài lòng của khách hàng.', icon: 'fa-chart-pie', color: 'text-amber-500', bg: 'bg-amber-100' },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300">
                {/* Updated: Layout change to flex-row for icon and title on mobile */}
                <div className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0 mb-3 sm:mb-6">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0`}>
                        <i className={`fa-solid ${feature.icon}`}></i>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 sm:mt-6">{feature.title}</h3>
                </div>
                <p className="text-slate-500 font-medium leading-relaxed text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Steps */}
      <section className="py-20 px-6">
         <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-10 sm:p-16 relative overflow-hidden text-center sm:text-left">
           {/* Background Mesh */}
           <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500 rounded-full blur-[100px] opacity-40"></div>
           <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pink-500 rounded-full blur-[100px] opacity-40"></div>
           
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Tích hợp siêu tốc trong 1 phút</h2>
                {/* Explicitly text-left for steps */}
                <div className="space-y-6 text-left">
                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">1</div>
                    <p className="text-white font-bold">Đăng ký tài khoản BibiChat</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold">2</div>
                    <p className="text-white font-bold">Upload tài liệu hướng dẫn</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">3</div>
                    <p className="text-white font-bold">Copy mã nhúng vào Website</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('login')}
                  className="mt-8 px-8 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-pink-50 transition-colors shadow-lg active:scale-95 w-full sm:w-auto"
                >
                  Thử ngay bây giờ
                </button>
              </div>
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl font-mono text-left text-xs sm:text-sm overflow-hidden">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <div className="text-slate-400">
                  <span className="text-pink-400">&lt;script&gt;</span><br/>
                  &nbsp;&nbsp;window.BibiChatConfig = {'{'}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;widgetId: <span className="text-emerald-400">"YOUR_ID"</span><br/>
                  &nbsp;&nbsp;{'}'};<br/>
                  <span className="text-pink-400">&lt;/script&gt;</span><br/>
                  <span className="text-pink-400">&lt;script src="{SERVER_URL}/widget.js" async defer&gt;&lt;/script&gt;</span>
                </div>
              </div>
           </div>
         </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-20 text-center px-6">
         <h2 className="text-4xl font-black text-slate-900 mb-6">Bạn đã sẵn sàng chưa?</h2>
         <p className="text-xl text-slate-500 font-medium mb-10">Gia nhập cộng đồng 5000+ website đang sử dụng BibiChat.</p>
         <button 
           onClick={() => onNavigate('login')}
           className="px-10 py-5 bg-gradient-to-tr from-pink-500 to-indigo-600 text-white text-xl font-bold rounded-full shadow-xl shadow-pink-300 hover:scale-105 transition-transform"
         >
           Tạo Widget Miễn Phí
         </button>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex flex-col gap-4 md:items-start items-center">
              {/* Footer Logo - Updated to match Header style */}
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md">
                   <i className="fa-solid fa-comment-dots text-xl"></i>
                 </div>
                 <span className="text-2xl font-black tracking-tight text-slate-700">
                    Bibi<span className="text-pink-500">Chat</span>
                 </span>
              </div>
              <p className="text-slate-400 text-sm font-bold ml-1">&copy; 2025 BibiChat. All rights reserved.</p>
           </div>
           
           <div className="flex gap-8 text-sm font-bold text-slate-500">
             <button onClick={() => onNavigate('terms')} className="hover:text-pink-500 transition-colors">Điều khoản</button>
             <button onClick={() => onNavigate('privacy')} className="hover:text-pink-500 transition-colors">Bảo mật</button>
             <button onClick={() => onNavigate('contact')} className="hover:text-pink-500 transition-colors">Liên hệ</button>
           </div>
           <div className="flex gap-4">
             {/* Corrected Icons for Footer */}
             <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors"><i className="fa-brands fa-facebook"></i></a>
             <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-700 hover:text-white transition-colors"><i className="fa-brands fa-linkedin"></i></a>
           </div>
        </div>
      </footer>

      {/* Scroll To Top Button */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 w-12 h-12 bg-pink-500 text-white rounded-full shadow-xl shadow-pink-200 flex items-center justify-center text-lg z-50 transition-all duration-300 hover:bg-pink-600 hover:-translate-y-1 ${showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
      >
        <i className="fa-solid fa-arrow-up"></i>
      </button>
    </div>
  );
};

export default LandingPage;
