
import React from 'react';
import { WidgetSettings } from '../types';

interface Props {
  settings: WidgetSettings;
  setSettings: (s: WidgetSettings) => void;
}

const WidgetPreview: React.FC<Props> = ({ settings, setSettings }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-3">
            <span className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-300 rounded-2xl flex items-center justify-center text-xl shadow-sm -rotate-6 border-2 border-indigo-200 dark:border-indigo-800">
              <i className="fa-solid fa-paint-roller"></i>
            </span>
            Trang điểm cho Widget
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-bold ml-1 text-base">Cá nhân hóa giao diện bot để phù hợp với thương hiệu.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border-2 border-slate-100 dark:border-slate-700 space-y-8 relative overflow-hidden">
          {/* Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-4 ml-1">Màu sắc chủ đạo</label>
            <div className="flex flex-wrap gap-4">
              {['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#1e293b'].map(color => (
                <button 
                  key={color}
                  onClick={() => setSettings({ ...settings, primaryColor: color })}
                  className={`w-14 h-14 rounded-full border-4 transition-all shadow-sm flex items-center justify-center ${settings.primaryColor === color ? 'border-slate-200 dark:border-slate-600 scale-110 shadow-lg ring-4 ring-offset-2 ring-indigo-200 dark:ring-indigo-900' : 'border-white dark:border-slate-700 hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                >
                  {settings.primaryColor === color && <i className="fa-solid fa-check text-white text-xl"></i>}
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Tên bé Bot</label>
            <div className="relative">
              <i className="fa-solid fa-tag absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"></i>
              <input 
                type="text"
                value={settings.botName}
                onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                className="w-full pl-12 pr-5 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all font-bold text-slate-800 dark:text-white text-base"
              />
            </div>
          </div>

          <div className="relative z-10">
            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Lời chào</label>
            <textarea 
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
              className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-3xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-sm font-bold transition-all resize-none text-slate-700 dark:text-slate-200 leading-relaxed"
              rows={3}
            />
          </div>

          <div className="relative z-10">
             <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Vị trí xuất hiện</label>
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setSettings({ ...settings, position: 'left' })}
                  className={`py-4 rounded-2xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-2 ${settings.position === 'left' ? 'bg-slate-800 dark:bg-indigo-600 border-slate-800 dark:border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                >
                  <i className="fa-solid fa-arrow-left"></i> Bên trái
                </button>
                <button 
                  onClick={() => setSettings({ ...settings, position: 'right' })}
                  className={`py-4 rounded-2xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-2 ${settings.position === 'right' ? 'bg-slate-800 dark:bg-indigo-600 border-slate-800 dark:border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                >
                  Bên phải <i className="fa-solid fa-arrow-right"></i>
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-[#f1f5f9] dark:bg-slate-900/50 rounded-[3rem] border-8 border-white dark:border-slate-800 shadow-2xl min-h-[600px] relative p-8 overflow-hidden">
        {/* Mockup Background */}
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/30 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100 dark:bg-teal-900/30 rounded-full blur-3xl opacity-60"></div>
        
        {/* Mock Browser/Phone */}
        <div className="w-full h-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-[2rem] shadow-xl relative overflow-hidden hidden lg:flex flex-col border border-white dark:border-slate-700 z-0">
           {/* Mock website content */}
           <div className="h-20 border-b border-slate-100 dark:border-slate-700 flex items-center px-8 gap-4 bg-white/50 dark:bg-slate-800/50">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-400 text-xl"><i className="fa-solid fa-store"></i></div>
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
              <div className="ml-auto flex gap-3">
                 <div className="w-20 h-8 bg-slate-100 dark:bg-slate-600 rounded-full"></div>
                 <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
              </div>
           </div>
           <div className="p-8 space-y-6">
              <div className="h-40 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-3xl w-full"></div>
              <div className="flex gap-6">
                 <div className="h-32 bg-slate-50 dark:bg-slate-700 rounded-3xl w-2/3"></div>
                 <div className="h-32 bg-slate-50 dark:bg-slate-700 rounded-3xl w-1/3"></div>
              </div>
              <div className="space-y-3">
                 <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-full"></div>
                 <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-5/6"></div>
                 <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-4/6"></div>
              </div>
           </div>
        </div>
        
        {/* Mock Chat Widget Preview */}
        <div className={`absolute bottom-8 ${settings.position === 'right' ? 'right-8' : 'left-8'} w-[340px] h-[500px] bg-white rounded-[2.5rem] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.3)] overflow-hidden border border-white flex flex-col z-20 transition-all duration-300 ring-4 ring-black/5`}>
          <div className="p-6 flex items-center justify-between text-white relative" style={{ backgroundColor: settings.primaryColor }}>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center backdrop-blur-md shadow-inner">
                <i className="fas fa-robot text-xl"></i>
              </div>
              <div>
                 <span className="font-extrabold text-base block">{settings.botName}</span>
                 <span className="text-[10px] font-bold opacity-90 bg-white/20 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    <i className="fa-solid fa-circle text-[6px] text-emerald-300 mr-1 align-middle"></i>
                    Sẵn sàng hỗ trợ
                 </span>
              </div>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
               <i className="fa-solid fa-ellipsis text-sm"></i>
            </button>
          </div>
          
          <div className="flex-1 p-5 bg-slate-50 space-y-4 overflow-y-auto">
            <div className="text-[10px] text-slate-400 text-center font-bold my-2">Hôm nay, 10:23 AM</div>
            <div className="flex items-end space-x-2">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shrink-0 flex items-center justify-center shadow-sm text-slate-400 text-xs">
                 <i className="fas fa-robot"></i>
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-bl-none text-xs font-bold text-slate-700 shadow-sm border border-slate-200 max-w-[85%] leading-relaxed">
                {settings.welcomeMessage}
              </div>
            </div>
            <div className="flex items-end space-x-2 justify-end">
              <div className="p-4 rounded-2xl rounded-br-none text-xs font-bold text-white shadow-md max-w-[85%] leading-relaxed" style={{ backgroundColor: settings.primaryColor }}>
                Mình cần tư vấn về sản phẩm ạ?
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input 
                type="text" 
                placeholder="Nhập tin nhắn..."
                className="w-full text-xs bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-400 pl-3"
                disabled
              />
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transform -rotate-45" style={{ backgroundColor: settings.primaryColor }}>
                 <i className="fa-solid fa-paper-plane text-xs translate-x-0.5 translate-y-0.5"></i>
              </div>
            </div>
            <div className="text-[9px] text-center text-slate-300 mt-2 font-bold">Powered by BibiChat</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
