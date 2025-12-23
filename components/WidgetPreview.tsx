
import React, { useState, useEffect, useRef } from 'react';
import { WidgetSettings, PluginConfig, User } from '../types';
import { apiService } from '../services/apiService';

interface Props {
  settings: WidgetSettings;
  setSettings: (s: WidgetSettings) => void;
  user: User;
  onConfigSave?: () => void;
}

const WidgetConfig: React.FC<Props> = ({ settings, setSettings, user, onConfigSave }) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'plugins'>('appearance');
  
  // Plugin State Management
  const [plugins, setPlugins] = useState<PluginConfig>({
      autoOpen: { enabled: false, delay: 5 },
      social: { enabled: false, zalo: '', phone: '' },
      leadForm: { enabled: false, title: 'Để lại thông tin để được tư vấn nhé!', trigger: 'manual' }
  });
  
  // Auto-save State
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const isFirstLoad = useRef(true);

  // Load Plugins on Mount
  useEffect(() => {
    const loadPlugins = async () => {
        const data = await apiService.getPlugins(user.id);
        setPlugins(data);
        isFirstLoad.current = false;
    };
    loadPlugins();
  }, [user.id]);

  // Auto-save logic for Plugins
  useEffect(() => {
      if (isFirstLoad.current) return;

      setIsSaving(true);
      const timer = setTimeout(async () => {
          await apiService.updatePlugins(user.id, plugins);
          setIsSaving(false);
          setLastSaved(Date.now());
          if (onConfigSave) onConfigSave();
      }, 200); // Reduced debounce to 200ms

      return () => clearTimeout(timer);
  }, [plugins, user.id]);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
          <div className="flex-1">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-3">
                  <span className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-300 rounded-2xl flex items-center justify-center text-xl shadow-sm -rotate-6 border-2 border-indigo-200 dark:border-indigo-800 shrink-0">
                  <i className="fa-solid fa-sliders"></i>
                  </span>
                  Cấu hình Widget
              </h2>
              <div className="flex items-center gap-3">
                  <p className="text-slate-600 dark:text-slate-400 font-bold ml-1">Thay đổi sẽ được cập nhật trực tiếp.</p>
                  {isSaving ? (
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                          <i className="fa-solid fa-circle-notch animate-spin"></i> Đang lưu...
                      </span>
                  ) : lastSaved ? (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
                          <i className="fa-solid fa-check"></i> Đã lưu
                      </span>
                  ) : null}
              </div>
          </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl flex font-bold text-sm shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
          <button 
              onClick={() => setActiveTab('appearance')}
              className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'appearance' ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              <i className="fa-solid fa-paint-roller"></i> Giao diện
          </button>
          <button 
              onClick={() => setActiveTab('plugins')}
              className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'plugins' ? 'bg-pink-50 dark:bg-slate-700 text-pink-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              <i className="fa-solid fa-puzzle-piece"></i> Tiện ích
          </button>
      </div>
      
      {/* Content Area */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden relative">
          
          {/* Live Preview Hint */}
          <div className="absolute top-6 right-6 z-10 hidden lg:block animate-bounce-slow">
              <div className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 opacity-80">
                  Nhìn xuống dưới kia kìa 
                  <i className={`fa-solid fa-arrow-right-long transform ${settings.position.includes('right') ? 'rotate-45' : 'rotate-[135deg]'}`}></i>
              </div>
          </div>

          <div className="p-8">
            {/* Tab Content: Appearance */}
            {activeTab === 'appearance' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                    
                    {/* Color Picker */}
                    <div className="space-y-4">
                        <label className="block text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase ml-1">Màu sắc chủ đạo</label>
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

                    {/* Bot Info */}
                    <div className="space-y-4">
                        <label className="block text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase ml-1">Thông tin Bot</label>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors"><i className="fa-solid fa-robot"></i></span>
                                <input 
                                    type="text"
                                    placeholder="Tên Bot (VD: Trợ lý ảo)"
                                    value={settings.botName}
                                    onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white transition-all text-base"
                                />
                            </div>
                            <div className="relative">
                                <textarea 
                                    value={settings.welcomeMessage}
                                    onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                                    placeholder="Lời chào mặc định..."
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-600 rounded-3xl focus:outline-none focus:border-indigo-500 font-bold text-sm text-slate-700 dark:text-slate-200 resize-none min-h-[120px]"
                                />
                                <span className="absolute bottom-4 right-4 text-slate-400 text-xs font-bold">Hiển thị đầu tiên khi mở chat</span>
                            </div>
                        </div>
                    </div>

                    {/* Position - Updated to 4 Corners */}
                    <div className="space-y-4">
                        <label className="block text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase ml-1">Vị trí xuất hiện</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setSettings({ ...settings, position: 'top-left' })}
                                className={`py-5 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center justify-center gap-2 ${settings.position === 'top-left' ? 'bg-slate-800 dark:bg-indigo-600 border-slate-800 dark:border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                            >
                                <i className="fa-solid fa-arrow-up-long -rotate-45 text-lg"></i> Trên Trái
                            </button>
                            <button 
                                onClick={() => setSettings({ ...settings, position: 'top-right' })}
                                className={`py-5 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center justify-center gap-2 ${settings.position === 'top-right' ? 'bg-slate-800 dark:bg-indigo-600 border-slate-800 dark:border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                            >
                                <i className="fa-solid fa-arrow-up-long rotate-45 text-lg"></i> Trên Phải
                            </button>
                            <button 
                                onClick={() => setSettings({ ...settings, position: 'bottom-left' })}
                                className={`py-5 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center justify-center gap-2 ${settings.position === 'bottom-left' ? 'bg-slate-800 dark:bg-indigo-600 border-slate-800 dark:border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                            >
                                <i className="fa-solid fa-arrow-down-long rotate-45 text-lg"></i> Dưới Trái
                            </button>
                            <button 
                                onClick={() => setSettings({ ...settings, position: 'bottom-right' })}
                                className={`py-5 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center justify-center gap-2 ${settings.position === 'bottom-right' || settings.position === 'right' as any ? 'bg-slate-800 dark:bg-indigo-600 border-slate-800 dark:border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                            >
                                <i className="fa-solid fa-arrow-down-long -rotate-45 text-lg"></i> Dưới Phải
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Plugins */}
            {activeTab === 'plugins' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex items-start gap-3">
                        <i className="fa-solid fa-bolt text-blue-500 mt-1"></i>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Mọi thay đổi sẽ được lưu tự động ngay lập tức.</p>
                    </div>

                    {/* Auto Open */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-100 dark:border-slate-600"><i className="fa-solid fa-door-open"></i></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Tự động chào</h4>
                                    <p className="text-sm text-slate-500 font-medium">Mở cửa sổ chat sau X giây</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={plugins.autoOpen.enabled} onChange={e => setPlugins({...plugins, autoOpen: {...plugins.autoOpen, enabled: e.target.checked}})} />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        {plugins.autoOpen.enabled && (
                            <div className="flex items-center gap-3 animate-in fade-in">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Độ trễ (giây):</label>
                                <input type="number" value={plugins.autoOpen.delay} onChange={e => setPlugins({...plugins, autoOpen: {...plugins.autoOpen, delay: parseInt(e.target.value)}})} className="w-20 px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-center font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500" />
                            </div>
                        )}
                    </div>

                    {/* Social */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-cyan-200 transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-100 dark:border-slate-600"><i className="fa-solid fa-share-nodes"></i></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Social Buttons</h4>
                                    <p className="text-sm text-slate-500 font-medium">Nút gọi nhanh Zalo/Hotline</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={plugins.social.enabled} onChange={e => setPlugins({...plugins, social: {...plugins.social, enabled: e.target.checked}})} />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-cyan-500"></div>
                            </label>
                        </div>
                        {plugins.social.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                <input type="text" placeholder="Số Zalo (VD: 097...)" value={plugins.social.zalo} onChange={e => setPlugins({...plugins, social: {...plugins.social, zalo: e.target.value}})} className="px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold w-full outline-none focus:border-cyan-500" />
                                <input type="text" placeholder="Hotline (VD: 1900...)" value={plugins.social.phone} onChange={e => setPlugins({...plugins, social: {...plugins.social, phone: e.target.value}})} className="px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold w-full outline-none focus:border-cyan-500" />
                            </div>
                        )}
                    </div>

                    {/* Lead Form */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-pink-200 transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-100 dark:border-slate-600"><i className="fa-solid fa-address-card"></i></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Form Khách hàng</h4>
                                    <p className="text-sm text-slate-500 font-medium">Thu thập SĐT/Email tiềm năng</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={plugins.leadForm.enabled} onChange={e => setPlugins({...plugins, leadForm: {...plugins.leadForm, enabled: e.target.checked}})} />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-pink-500"></div>
                            </label>
                        </div>
                        {plugins.leadForm.enabled && (
                            <div className="space-y-4 animate-in fade-in">
                                <input type="text" value={plugins.leadForm.title} onChange={e => setPlugins({...plugins, leadForm: {...plugins.leadForm, title: e.target.value}})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none focus:border-pink-500" placeholder="Tiêu đề form" />
                                <div className="flex gap-4">
                                    <button onClick={() => setPlugins({...plugins, leadForm: {...plugins.leadForm, trigger: 'on_open'}})} className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${plugins.leadForm.trigger === 'on_open' ? 'bg-pink-50 dark:bg-slate-800 border-pink-500 text-pink-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500'}`}>Tự động mở</button>
                                    <button onClick={() => setPlugins({...plugins, leadForm: {...plugins.leadForm, trigger: 'manual'}})} className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${plugins.leadForm.trigger === 'manual' ? 'bg-pink-50 dark:bg-slate-800 border-pink-500 text-pink-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500'}`}>Hiện nút bấm</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default WidgetConfig;
