
import React, { useState, useEffect } from 'react';

type PageType = 'landing' | 'login' | 'terms' | 'privacy' | 'contact' | 'demo';

interface Props {
  onNavigate: (page: PageType) => void;
}

// Layout chung cho các trang phụ - Phiên bản "Soft & Cute"
const PublicLayout: React.FC<{
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  children: React.ReactNode;
  onNavigate: (page: PageType) => void;
}> = ({ title, subtitle, icon, color, children, onNavigate }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Cuộn lên đầu trang khi component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    <div className="min-h-screen bg-slate-50/50 font-sans selection:bg-pink-100 selection:text-pink-600 overflow-x-hidden flex flex-col relative">
      {/* Background Pattern - Polka Dots & Shapes */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-10 left-10 w-4 h-4 rounded-full bg-pink-300"></div>
        <div className="absolute top-40 right-20 w-6 h-6 rounded-full bg-blue-300"></div>
        <div className="absolute bottom-20 left-1/4 w-8 h-8 rounded-full bg-yellow-300"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-purple-300"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-pink-100/50 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-100/50 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Navbar - Updated sizes to match Landing Page */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 sm:h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group" onClick={() => onNavigate('landing')}>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-pink-400 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-200 group-hover:rotate-12 transition-transform duration-300">
              <i className="fa-solid fa-comment-dots text-2xl sm:text-3xl"></i>
            </div>
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800">Bibi<span className="text-pink-500">Chat</span></span>
          </div>
          <button 
            onClick={() => onNavigate('landing')}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all shadow-sm"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
      </nav>

      {/* Content - Adjusted top padding for taller header */}
      <main className="flex-1 pt-36 sm:pt-44 pb-20 px-4 relative flex flex-col items-center z-10">
         <div className="w-full max-w-4xl mx-auto">
            {/* Header with Floating Icon */}
            <div className="text-center mb-8 relative z-20">
               <div className="inline-block relative">
                 <div className={`w-24 h-24 mx-auto ${color} text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-xl shadow-pink-100 mb-4 transform -rotate-3 animate-bounce-slow border-[6px] border-white`}>
                   <i className={`fa-solid ${icon}`}></i>
                 </div>
                 {/* Decorative elements around icon */}
                 <div className="absolute -top-2 -right-4 text-2xl animate-pulse">✨</div>
                 <div className="absolute bottom-0 -left-4 text-xl animate-pulse delay-700">✦</div>
               </div>
               
               <h1 className="text-4xl sm:text-5xl font-black text-slate-800 mb-3 tracking-tight">{title}</h1>
               <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">{subtitle}</p>
            </div>

            {/* Main Card - Sticker Style */}
            <div className="group relative">
               {/* Card Background Layer for Depth */}
               <div className="absolute inset-0 bg-slate-200 rounded-[3.2rem] translate-y-3 translate-x-0 scale-[0.98] transition-transform duration-500 group-hover:translate-y-4"></div>
               
               {/* Actual Content Card */}
               <div className="bg-white p-8 sm:p-14 rounded-[3rem] shadow-2xl shadow-slate-200/50 border-[6px] border-white relative overflow-hidden animate-in zoom-in duration-500 transform -rotate-1 hover:rotate-0 transition-transform duration-500 ease-out">
                  {children}
               </div>
            </div>
         </div>
      </main>

      {/* Footer Simple */}
      <footer className="py-8 text-center text-slate-400 font-bold text-xs relative z-10">
        <p>&copy; 2024 BibiChat. Made with <i className="fa-solid fa-heart text-pink-400 mx-1 animate-beat"></i> for you.</p>
        <div className="flex justify-center gap-4 mt-4">
            <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all shadow-sm"><i className="fa-brands fa-facebook"></i></a>
            <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-blue-700 hover:scale-110 transition-all shadow-sm"><i className="fa-brands fa-linkedin"></i></a>
        </div>
      </footer>

      {/* Scroll To Top Button */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 w-12 h-12 bg-pink-500 text-white border-4 border-white rounded-full shadow-xl shadow-pink-200 flex items-center justify-center text-lg z-50 transition-all duration-300 hover:bg-pink-600 hover:-translate-y-1 ${showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
      >
        <i className="fa-solid fa-arrow-up"></i>
      </button>
    </div>
  );
};

export const TermsPage: React.FC<Props> = ({ onNavigate }) => (
  <PublicLayout 
    title="Điều khoản sử dụng" 
    subtitle="Những quy tắc nhỏ để chúng ta chơi vui vẻ bên nhau" 
    icon="fa-file-contract" 
    color="bg-indigo-500"
    onNavigate={onNavigate}
  >
    <div className="space-y-8 text-slate-600 leading-relaxed text-base sm:text-lg">
      <section className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-50">
        <h3 className="text-xl font-black text-slate-800 mb-3 flex items-center">
          <span className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center mr-3 text-lg shadow-sm font-black border-2 border-indigo-100">1</span>
          Chào mừng bạn!
        </h3>
        <p>Cảm ơn bạn đã ghé thăm BibiChat! Khi sử dụng dịch vụ của chúng tớ, bạn đồng ý trở thành một "người bạn tốt" của hệ thống. Chúng tớ cung cấp công cụ AI để giúp website của bạn xịn xò hơn.</p>
      </section>

      <section className="bg-pink-50/50 p-6 rounded-3xl border border-pink-50">
        <h3 className="text-xl font-black text-slate-800 mb-3 flex items-center">
          <span className="w-10 h-10 bg-white text-pink-600 rounded-xl flex items-center justify-center mr-3 text-lg shadow-sm font-black border-2 border-pink-100">2</span>
          Sử dụng hợp lệ
        </h3>
        <p>Bạn hứa sẽ không dùng BibiChat để:</p>
        <ul className="list-none mt-2 space-y-2">
          <li className="flex items-center gap-3"><i className="fa-solid fa-xmark text-rose-500"></i> Spam hoặc làm phiền người khác.</li>
          <li className="flex items-center gap-3"><i className="fa-solid fa-xmark text-rose-500"></i> Đăng tải nội dung xấu, độc hại.</li>
          <li className="flex items-center gap-3"><i className="fa-solid fa-xmark text-rose-500"></i> Cố tình tấn công hệ thống bé Bibi.</li>
        </ul>
      </section>

      <div className="bg-slate-900 text-white p-6 rounded-3xl text-center shadow-lg transform rotate-1">
        <i className="fa-solid fa-handshake text-3xl mb-2 text-yellow-400"></i>
        <p className="font-bold text-lg">Chúng ta cùng nhau xây dựng một cộng đồng văn minh nhé!</p>
      </div>
    </div>
  </PublicLayout>
);

export const PrivacyPage: React.FC<Props> = ({ onNavigate }) => (
  <PublicLayout 
    title="Chính sách bảo mật" 
    subtitle="Bí mật của bạn an toàn tuyệt đối với Bibi" 
    icon="fa-shield-heart" 
    color="bg-emerald-500"
    onNavigate={onNavigate}
  >
    <div className="space-y-8 text-slate-600 leading-relaxed text-base sm:text-lg">
      <section>
        <h3 className="text-2xl font-black text-slate-800 mb-4 text-center">Thu thập dữ liệu</h3>
        <p className="text-center mb-6">Chúng tớ chỉ thu thập những thông tin cần thiết nhất để BibiChat hoạt động:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 border border-emerald-100 text-center hover:scale-105 transition-transform">
             <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-emerald-500 text-2xl shadow-sm">
                <i className="fa-solid fa-envelope"></i>
             </div>
             <span className="font-bold text-slate-800">Email của bạn</span>
          </div>
          <div className="bg-emerald-50 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 border border-emerald-100 text-center hover:scale-105 transition-transform">
             <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-emerald-500 text-2xl shadow-sm">
                <i className="fa-solid fa-file-lines"></i>
             </div>
             <span className="font-bold text-slate-800">Tài liệu upload</span>
          </div>
        </div>
      </section>

      <div className="border-t-2 border-dashed border-slate-200 my-6"></div>

      <section>
        <h3 className="text-xl font-black text-slate-800 mb-4 text-center">Chúng tớ làm gì với dữ liệu?</h3>
        <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-check"></i></span>
            <span className="font-medium">Huấn luyện AI trả lời riêng cho website của bạn.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-check"></i></span>
            <span className="font-medium">Cải thiện chất lượng dịch vụ tốt hơn mỗi ngày.</span>
          </div>
        </div>
      </section>
      
      <div className="flex items-center justify-center pt-4">
         <i className="fa-solid fa-lock text-emerald-100 text-8xl animate-pulse"></i>
      </div>
    </div>
  </PublicLayout>
);

export const DemoPage: React.FC<Props> = ({ onNavigate }) => (
  <PublicLayout 
    title="Xem Demo" 
    subtitle="Trải nghiệm thử bé Bibi thông minh như thế nào nhé" 
    icon="fa-play" 
    color="bg-rose-500"
    onNavigate={onNavigate}
  >
    <div className="space-y-8 text-center">
      <div className="aspect-video bg-slate-900 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group shadow-2xl border-[6px] border-slate-100 mx-auto transform hover:scale-[1.02] transition-transform duration-500">
         <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/YZnpCQrr9iU" 
            title="BibiChat Demo Video" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            className="absolute inset-0 w-full h-full"
         ></iframe>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 hover:bg-rose-100 transition-colors">
             <div className="font-black text-3xl text-rose-300 mb-2">01</div>
             <p className="font-bold text-slate-800 text-lg">Tự động trả lời</p>
             <p className="text-sm text-slate-500 mt-1">Khách hỏi là đáp liền, không để chờ đợi.</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-3xl border-2 border-purple-100 hover:bg-purple-100 transition-colors">
             <div className="font-black text-3xl text-purple-300 mb-2">02</div>
             <p className="font-bold text-slate-800 text-lg">Hiểu tiếng Việt</p>
             <p className="text-sm text-slate-500 mt-1">Xử lý ngôn ngữ tự nhiên cực mượt.</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 hover:bg-blue-100 transition-colors">
             <div className="font-black text-3xl text-blue-300 mb-2">03</div>
             <p className="font-bold text-slate-800 text-lg">Hoạt động 24/7</p>
             <p className="text-sm text-slate-500 mt-1">Làm việc chăm chỉ cả ngày lẫn đêm.</p>
          </div>
      </div>

      <button 
         onClick={() => onNavigate('login')}
         className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-300 hover:bg-slate-800 transition-all active:scale-95 text-lg hover:-translate-y-1 w-full sm:w-auto"
      >
         Dùng thử ngay bây giờ
      </button>
    </div>
  </PublicLayout>
);

export const ContactPage: React.FC<Props> = ({ onNavigate }) => (
  <PublicLayout 
    title="Liên hệ với chúng tớ" 
    subtitle="Đừng ngại, chúng tớ rất thích nghe từ bạn!" 
    icon="fa-paper-plane" 
    color="bg-pink-500"
    onNavigate={onNavigate}
  >
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-gradient-to-br from-pink-50 to-white p-8 rounded-[2.5rem] border-2 border-pink-100 text-center relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-pink-200 transition-colors"></div>
         
         <div className="w-20 h-20 bg-white text-pink-500 rounded-3xl flex items-center justify-center text-4xl shadow-lg mx-auto mb-4 border-4 border-pink-50 relative z-10 transform rotate-3 group-hover:rotate-0 transition-transform">
           <i className="fa-solid fa-envelope-open-text"></i>
         </div>
         <h3 className="text-2xl font-black text-slate-800 mb-2 relative z-10">Gửi Email</h3>
         <p className="text-slate-500 mb-4 text-base relative z-10 font-medium">Phản hồi trong vòng 24h nha.</p>
         <a href="mailto:hello@bibichat.io" className="inline-block px-6 py-2 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-colors relative z-10 shadow-md">hello@bibichat.io</a>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm text-center relative overflow-hidden">
         <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-sm mx-auto mb-4 border-4 border-emerald-100">
           <i className="fa-solid fa-phone-volume animate-tada"></i>
         </div>
         <h3 className="text-2xl font-black text-slate-800 mb-2">Hotline</h3>
         <a href="tel:0979116118" className="text-4xl font-black text-emerald-500 hover:text-emerald-600 tracking-wider block my-2">0979.116.118</a>
         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Gọi lúc nào cũng được hết á!</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <a href="#" className="bg-[#1877F2] p-4 rounded-[2rem] text-center group shadow-lg hover:-translate-y-1 transition-transform">
            <i className="fa-brands fa-facebook text-3xl text-white mb-2 block"></i>
            <span className="font-bold text-white text-sm">Facebook</span>
         </a>
         <a href="#" className="bg-[#0A66C2] p-4 rounded-[2rem] text-center group shadow-lg hover:-translate-y-1 transition-transform">
            <i className="fa-brands fa-linkedin text-3xl text-white mb-2 block"></i>
            <span className="font-bold text-white text-sm">LinkedIn</span>
         </a>
      </div>

      <div className="text-center pt-2">
         <div className="inline-flex items-center bg-slate-50 px-5 py-3 rounded-full border border-slate-100 text-slate-500 font-bold text-xs">
           <i className="fa-solid fa-map-pin text-rose-500 mr-2 text-base"></i>
           Tầng mây thứ 9, Tòa nhà Internet
         </div>
      </div>
    </div>
  </PublicLayout>
);
