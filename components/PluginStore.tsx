
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { User, PluginConfig } from '../types';

interface Props {
  user: User;
}

interface MockLead {
    id: string;
    name: string;
    phone: string;
    email: string;
    time: string;
}

const PluginStore: React.FC<Props> = ({ user }) => {
  const [plugins, setPlugins] = useState<PluginConfig>({
      autoOpen: { enabled: false, delay: 5 },
      social: { enabled: false, zalo: '', phone: '' },
      leadForm: { enabled: false, title: 'Để lại thông tin để được tư vấn nhé!', trigger: 'manual' }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState(true); // Default open in preview to show layout
  const [mockLeads, setMockLeads] = useState<MockLead[]>([]);
  const [previewForm, setPreviewForm] = useState({ name: '', phone: '', email: '' });
  const [showPreviewForm, setShowPreviewForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPlugins = async () => {
        const data = await apiService.getPlugins(user.id);
        setPlugins(data);
        // Sync mock state
        if (data.leadForm.trigger === 'on_open') setShowPreviewForm(true);
        setIsLoading(false);
    };
    loadPlugins();
  }, [user.id]);

  // Scroll to bottom of chat
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [showPreviewForm, mockLeads]);

  const handleSave = async () => {
      setIsSaving(true);
      // Removed artificial delay
      await apiService.updatePlugins(user.id, plugins);
      setIsSaving(false);
  };

  const handleMockSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!previewForm.name || !previewForm.phone) return;
      
      const newMock: MockLead = {
          id: Date.now().toString(),
          name: previewForm.name,
          phone: previewForm.phone,
          email: previewForm.email,
          time: new Date().toLocaleTimeString('vi-VN')
      };
      
      setMockLeads(prev => [newMock, ...prev]);
      setPreviewForm({ name: '', phone: '', email: '' });
      setShowPreviewForm(false);
  };

  const resetPreview = () => {
      setIsPreviewOpen(false);
      setTimeout(() => setIsPreviewOpen(true), 100);
      setMockLeads([]);
      setShowPreviewForm(plugins.leadForm.trigger === 'on_open');
  };

  if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-[500px]">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
          <p className="mt-4 font-bold text-slate-500">Đang tải kho tiện ích...</p>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center bg-gradient-to-r from-violet-500 to-fuchsia-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
         <div className="relative z-10">
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
               <i className="fa-solid fa-puzzle-piece"></i> Kho Tiện ích mở rộng
            </h2>
            <p className="font-medium opacity-90 text-lg">Nâng cấp Chatbot của bạn thành siêu nhân marketing!</p>
         </div>
         <div className="absolute right-0 top-0 h-full w-1/2 bg-white/10 skew-x-12"></div>
         <div className="absolute -bottom-10 -right-10 text-9xl opacity-20 rotate-12"><i className="fa-solid fa-rocket"></i></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
         {/* Left Column: Configuration */}
         <div className="space-y-8">
             {/* Plugin 1: Auto Open */}
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex gap-4">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                         <i className="fa-solid fa-door-open"></i>
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tự động chào</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tự bung chat để gây chú ý</p>
                      </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={plugins.autoOpen.enabled} onChange={e => setPlugins({...plugins, autoOpen: {...plugins.autoOpen, enabled: e.target.checked}})} />
                      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>
                
                <div className={`space-y-4 transition-all ${plugins.autoOpen.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Độ trễ (giây)</label>
                      <input 
                        type="number" 
                        value={plugins.autoOpen.delay}
                        onChange={e => setPlugins({...plugins, autoOpen: {...plugins.autoOpen, delay: parseInt(e.target.value)}})}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white focus:border-blue-500 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-2 italic">* Bot sẽ tự động mở sau khi khách vào web {plugins.autoOpen.delay}s.</p>
                   </div>
                </div>
             </div>

             {/* Plugin 2: Social Buttons */}
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex gap-4">
                      <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                         <i className="fa-solid fa-share-nodes"></i>
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-slate-800 dark:text-white">Kết nối mạng xã hội</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Nút Zalo & Hotline trên Widget</p>
                      </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={plugins.social.enabled} onChange={e => setPlugins({...plugins, social: {...plugins.social, enabled: e.target.checked}})} />
                      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-cyan-500"></div>
                   </label>
                </div>
                
                <div className={`space-y-4 transition-all ${plugins.social.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Số Zalo</label>
                         <input 
                            type="text" 
                            value={plugins.social.zalo}
                            onChange={e => setPlugins({...plugins, social: {...plugins.social, zalo: e.target.value}})}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white focus:border-cyan-500 outline-none"
                            placeholder="VD: 0979..."
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hotline</label>
                         <input 
                            type="text" 
                            value={plugins.social.phone}
                            onChange={e => setPlugins({...plugins, social: {...plugins.social, phone: e.target.value}})}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white focus:border-cyan-500 outline-none"
                            placeholder="VD: 0979..."
                         />
                      </div>
                   </div>
                </div>
             </div>

             {/* Plugin 3: Lead Collection */}
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex gap-4">
                      <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                         <i className="fa-solid fa-address-card"></i>
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-slate-800 dark:text-white">Thu thập Khách hàng</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tự động xin thông tin SĐT/Email</p>
                      </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={plugins.leadForm.enabled} onChange={e => {
                          const enabled = e.target.checked;
                          setPlugins({...plugins, leadForm: {...plugins.leadForm, enabled}});
                          if(enabled && plugins.leadForm.trigger === 'on_open') setShowPreviewForm(true);
                          else if(!enabled) setShowPreviewForm(false);
                      }} />
                      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-pink-500"></div>
                   </label>
                </div>
                
                <div className={`space-y-4 transition-all ${plugins.leadForm.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tiêu đề Form</label>
                         <input 
                            type="text" 
                            value={plugins.leadForm.title}
                            onChange={e => setPlugins({...plugins, leadForm: {...plugins.leadForm, title: e.target.value}})}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white focus:border-pink-500 outline-none"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thời điểm hiện Form</label>
                         <div className="flex gap-2">
                            <button 
                               onClick={() => {
                                   setPlugins({...plugins, leadForm: {...plugins.leadForm, trigger: 'on_open'}});
                                   setShowPreviewForm(true);
                               }}
                               className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${plugins.leadForm.trigger === 'on_open' ? 'bg-pink-50 border-pink-500 text-pink-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                               Tự động mở
                            </button>
                            <button 
                               onClick={() => {
                                   setPlugins({...plugins, leadForm: {...plugins.leadForm, trigger: 'manual'}});
                                   setShowPreviewForm(false);
                               }}
                               className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${plugins.leadForm.trigger === 'manual' ? 'bg-pink-50 border-pink-500 text-pink-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                               Hiện nút bấm
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Save Action - Moved inside the flow */}
             <div className="pt-4 flex justify-end">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full md:w-auto px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg shadow-xl shadow-slate-300 dark:shadow-none hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                    Lưu thay đổi
                </button>
             </div>
         </div>

         {/* Right Column: Live Preview & Data Simulation */}
         <div className="sticky top-6 space-y-6">
             <div className="flex justify-between items-center px-2">
                 <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                     <i className="fa-solid fa-mobile-screen-button text-indigo-500"></i> Xem trước trực tiếp
                 </h3>
                 <button onClick={resetPreview} className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                     <i className="fa-solid fa-rotate-right mr-1"></i> Reset
                 </button>
             </div>

             {/* Phone Mockup */}
             <div className="bg-slate-100 dark:bg-slate-900/50 rounded-[3rem] border-8 border-white dark:border-slate-800 shadow-2xl h-[600px] relative overflow-hidden flex flex-col items-end justify-end p-4">
                 {/* Widget Button */}
                 <div 
                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                    className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-xl transition-all cursor-pointer hover:scale-105 active:scale-95 relative z-20"
                    style={{ backgroundColor: user.botSettings.primaryColor }}
                 >
                    {isPreviewOpen ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-comment-dots"></i>}
                 </div>

                 {/* Widget Window */}
                 {isPreviewOpen && (
                     <div className="absolute bottom-20 right-4 w-[300px] h-[450px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-slate-100 z-10">
                         {/* Header */}
                         <div className="p-3 text-white flex justify-between items-center" style={{ backgroundColor: user.botSettings.primaryColor }}>
                             <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-robot text-xs"></i></div>
                                 <span className="font-bold text-sm">{user.botSettings.botName}</span>
                             </div>
                             {/* Social Plugin Preview */}
                             {plugins.social.enabled && (
                                 <div className="flex gap-1">
                                     {plugins.social.phone && <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-phone text-[10px]"></i></div>}
                                     {plugins.social.zalo && <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[8px] font-bold">Zalo</div>}
                                 </div>
                             )}
                         </div>

                         {/* Body */}
                         <div className="flex-1 bg-slate-50 p-3 overflow-y-auto space-y-3 relative">
                             {/* Welcome Message */}
                             <div className="flex justify-start">
                                 <div className="bg-white text-slate-700 border border-slate-100 p-3 rounded-2xl rounded-tl-none text-xs font-medium shadow-sm max-w-[85%]">
                                     {user.botSettings.welcomeMessage}
                                 </div>
                             </div>

                             {/* Lead Form Preview */}
                             {plugins.leadForm.enabled && showPreviewForm && (
                                 <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-md animate-in zoom-in duration-300 relative z-10">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="text-xs font-bold text-slate-700">{plugins.leadForm.title}</span>
                                         <button onClick={() => setShowPreviewForm(false)} className="text-slate-400 hover:text-rose-500"><i className="fa-solid fa-xmark"></i></button>
                                     </div>
                                     <form onSubmit={handleMockSubmit} className="space-y-2">
                                         <input required type="text" placeholder="Tên..." value={previewForm.name} onChange={e => setPreviewForm({...previewForm, name: e.target.value})} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                                         <input required type="tel" placeholder="SĐT..." value={previewForm.phone} onChange={e => setPreviewForm({...previewForm, phone: e.target.value})} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                                         <input type="email" placeholder="Email..." value={previewForm.email} onChange={e => setPreviewForm({...previewForm, email: e.target.value})} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                                         <button type="submit" className="w-full py-1.5 bg-pink-500 text-white rounded-lg text-xs font-bold">Gửi (Test)</button>
                                     </form>
                                 </div>
                             )}

                             {/* Success Message Mock */}
                             {mockLeads.length > 0 && (
                                 <div className="flex justify-start">
                                     <div className="bg-white text-slate-700 border border-slate-100 p-3 rounded-2xl rounded-tl-none text-xs font-medium shadow-sm max-w-[85%]">
                                         Cảm ơn bạn! Chúng mình sẽ liên hệ sớm nha.
                                     </div>
                                 </div>
                             )}
                             <div ref={messagesEndRef} />
                         </div>

                         {/* Footer */}
                         <div className="p-3 bg-white border-t border-slate-100 relative">
                             {plugins.leadForm.enabled && plugins.leadForm.trigger === 'manual' && !showPreviewForm && (
                                 <button onClick={() => setShowPreviewForm(true)} className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-pink-200 text-pink-500 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap">
                                     <i className="fa-regular fa-hand-point-up"></i> Để lại SĐT
                                 </button>
                             )}
                             <div className="h-8 bg-slate-100 rounded-full w-full"></div>
                         </div>
                     </div>
                 )}
             </div>

             {/* Data Simulation Console */}
             <div className="bg-slate-900 rounded-[2rem] p-5 shadow-xl text-white overflow-hidden">
                 <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                     <h4 className="font-mono text-sm font-bold text-emerald-400 flex items-center gap-2">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                         Giả lập dữ liệu nhận được
                     </h4>
                     <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-slate-400">Không lưu vào DB</span>
                 </div>
                 
                 <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 font-mono text-xs">
                     {mockLeads.length === 0 ? (
                         <div className="text-slate-500 italic text-center py-4">Chưa có dữ liệu test... Hãy thử điền form bên trên.</div>
                     ) : (
                         mockLeads.map(lead => (
                             <div key={lead.id} className="bg-white/5 p-3 rounded-lg border-l-2 border-emerald-500 animate-in slide-in-from-left duration-300">
                                 <div className="flex justify-between text-slate-400 mb-1">
                                     <span>New Lead Captured</span>
                                     <span>{lead.time}</span>
                                 </div>
                                 <div className="text-emerald-300">
                                     {`{ name: "${lead.name}", phone: "${lead.phone}" }`}
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default PluginStore;
