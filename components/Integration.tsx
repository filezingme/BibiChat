
import React, { useState } from 'react';

interface Props {
  userId: string;
}

const Integration: React.FC<Props> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  
  // URL của Server Backend (Lấy từ biến môi trường hoặc fallback về URL chính thức Koyeb)
  const SERVER_URL = process.env.SERVER_URL || "https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app";
  
  // Break script tag to prevent parsing issues
  const embedCode = `<!-- BibiChat Widget Embed Code -->
<script>
  window.BibiChatConfig = {
    widgetId: "${userId}", // Đây là ID định danh Widget của bạn
  };
</script>
<script src="${SERVER_URL}/widget.js" async defer></` + `script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-10 animate-in fade-in duration-500 pb-16">
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
          <span className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
             <i className="fa-solid fa-code"></i>
          </span>
          Tích hợp Website
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-base ml-1">Mang sức mạnh AI vào website của bạn chỉ với 2 bước đơn giản.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none rounded-3xl overflow-hidden">
        <div className="p-5 bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Production Ready</span>
          </div>
          <button 
            onClick={handleCopy}
            className={`w-full sm:w-auto px-5 py-2.5 text-sm font-bold transition-all flex items-center justify-center shadow-sm rounded-xl ${copied ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}
          >
            {copied ? (
              <>
                <i className="fa-solid fa-check mr-2"></i> Đã sao chép
              </>
            ) : (
              <>
                <i className="fa-solid fa-copy mr-2"></i> Sao chép mã
              </>
            )}
          </button>
        </div>
        <div className="p-6 lg:p-8 bg-[#1e293b] overflow-x-auto relative group">
          <div className="absolute top-4 right-4 flex space-x-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
             <div className="w-3 h-3 rounded-full bg-rose-500"></div>
             <div className="w-3 h-3 rounded-full bg-amber-500"></div>
             <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          </div>
          <pre className="text-blue-300 font-mono text-xs sm:text-sm leading-relaxed">
            <code>{embedCode}</code>
          </pre>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: 'fa-solid fa-clipboard-check', title: '1. Sao chép', desc: 'Copy đoạn mã script phía trên.' },
          { icon: 'fa-solid fa-file-code', title: '2. Dán mã', desc: 'Chèn vào trước thẻ </body>.' },
          { icon: 'fa-solid fa-rocket', title: '3. Hoàn tất', desc: 'Lưu lại và AI sẽ xuất hiện ngay.' }
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-lg shadow-slate-100 dark:shadow-none flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
              <i className={`${item.icon} text-2xl`}></i>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-lg">{item.title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 p-8 rounded-3xl border border-amber-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-8">
         <div className="shrink-0 w-20 h-20 bg-white dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center text-3xl shadow-md shadow-amber-200/50 dark:shadow-none">
           <i className="fa-solid fa-shield-halved"></i>
         </div>
         <div className="flex-1">
           <h4 className="font-bold text-amber-900 dark:text-amber-500 mb-1 text-lg">Bảo mật tên miền</h4>
           <p className="text-sm text-amber-800/70 dark:text-slate-400 font-medium leading-relaxed">
             Chỉ cho phép widget hiển thị trên các website được liệt kê để ngăn chặn việc sử dụng trái phép.
           </p>
         </div>
         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="domain.com"
              className="px-5 py-3 border border-amber-200 dark:border-slate-600 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-200 dark:focus:ring-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white w-full sm:w-48"
            />
            <button className="bg-amber-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-amber-600 whitespace-nowrap shadow-lg shadow-amber-200 dark:shadow-none transition-all active:scale-95">
              Thêm
            </button>
         </div>
      </div>
    </div>
  );
};

export default Integration;
