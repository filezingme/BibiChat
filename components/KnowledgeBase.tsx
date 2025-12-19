
import React, { useState } from 'react';
import { Document } from '../types';

interface Props {
  userId: string;
  documents: Document[];
  onAddDocument: (name: string, content: string, type: 'text' | 'file') => void;
  onDeleteDocument: (id: string) => void;
}

const KnowledgeBase: React.FC<Props> = ({ userId, documents, onAddDocument, onDeleteDocument }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [newDocText, setNewDocText] = useState('');
  const [newDocName, setNewDocName] = useState('');
  
  // State for Tip Modal
  const [showTipModal, setShowTipModal] = useState(false);

  const handleManualAdd = async () => {
    if (!newDocName || !newDocText) return;
    setIsProcessing(true);
    await onAddDocument(newDocName, newDocText, 'text');
    setNewDocName('');
    setNewDocText('');
    setIsProcessing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      await onAddDocument(file.name, content, 'file');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-xl shadow-indigo-100/50 dark:shadow-none">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xl shadow-sm rotate-3 border-2 border-indigo-200 dark:border-indigo-800">
               <i className="fa-solid fa-brain"></i>
            </span>
            Kho tri thức AI
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 font-bold mt-2 ml-1">Nạp dữ liệu để AI thông minh hơn nè.</p>
        </div>
        <div className="w-full md:w-auto">
           <label className="cursor-pointer bg-slate-800 dark:bg-violet-600 hover:bg-slate-900 dark:hover:bg-violet-700 text-white px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center shadow-lg shadow-slate-300 dark:shadow-violet-900/40 active:scale-95 transform hover:-translate-y-1 text-base">
            <i className="fa-solid fa-cloud-arrow-up mr-2 text-xl"></i>
            Tải tài liệu lên
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border-2 border-slate-100 dark:border-slate-700 overflow-hidden p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-indigo-50/50 dark:bg-slate-700/50">
                    <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-l-2xl pl-8 whitespace-nowrap">
                      <i className="fa-regular fa-folder-open mr-2 text-indigo-400"></i>
                      Tên tài liệu
                    </th>
                    <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                      <i className="fa-solid fa-shapes mr-2 text-purple-400"></i>
                      Định dạng
                    </th>
                    <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                      <i className="fa-solid fa-heart-pulse mr-2 text-pink-400"></i>
                      Trạng thái
                    </th>
                    <th className="px-6 py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-r-2xl text-right pr-8 whitespace-nowrap">
                      <i className="fa-solid fa-wand-magic-sparkles mr-2 text-amber-400"></i>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="bg-slate-50 dark:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors group rounded-2xl">
                      <td className="px-6 py-5 rounded-l-2xl pl-8">
                        <div className="flex items-center min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm border-2 border-white dark:border-slate-600 ${doc.type === 'file' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            <i className={`fa-solid ${doc.type === 'file' ? 'fa-file-lines' : 'fa-align-left'} text-lg`}></i>
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-base text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.name}</p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block mt-1 shadow-sm border border-slate-200 dark:border-slate-600">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] sm:text-xs font-black px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full uppercase tracking-wider border border-slate-200 dark:border-slate-600 shadow-sm whitespace-nowrap">
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                          Đã học
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right rounded-r-2xl pr-8">
                        <button 
                          onClick={() => onDeleteDocument(doc.id)} 
                          className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-600 hover:border-rose-200 dark:hover:border-rose-800 shadow-sm hover:scale-110 ml-auto"
                          title="Xóa tài liệu"
                        >
                          <i className="fa-solid fa-trash-can text-base"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 border-4 border-slate-100 dark:border-slate-600 shadow-sm">
                            <i className="fa-solid fa-folder-open text-4xl"></i>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Chưa có gì hết</h3>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Thêm tài liệu để bé AI bắt đầu học việc nhé.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-lg shadow-slate-200/40 dark:shadow-none border-2 border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center text-lg">
              <i className="fa-solid fa-pen-to-square text-indigo-500 dark:text-indigo-400 mr-3 text-2xl"></i>
              Soạn thảo nhanh
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-2">Tiêu đề</label>
                <input 
                  type="text" 
                  value={newDocName} 
                  onChange={(e) => setNewDocName(e.target.value)} 
                  placeholder="Ví dụ: Chính sách bảo hành" 
                  className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-sm font-bold transition-all text-slate-800 dark:text-white placeholder:text-slate-400" 
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-2">Nội dung</label>
                <textarea 
                  rows={10} 
                  value={newDocText} 
                  onChange={(e) => setNewDocText(e.target.value)} 
                  placeholder="Nhập nội dung chi tiết..." 
                  className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-sm font-medium transition-all resize-none text-slate-800 dark:text-white placeholder:text-slate-400 leading-relaxed" 
                />
              </div>
              <button 
                onClick={handleManualAdd} 
                disabled={!newDocName || !newDocText || isProcessing} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-95 flex items-center justify-center gap-3 text-base"
              >
                {isProcessing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <><i className="fa-solid fa-floppy-disk text-lg"></i> Lưu dữ liệu</>}
              </button>
            </div>
          </div>
          
          {/* Tip Card - Neutral Gradient */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 relative overflow-hidden group border-2 border-transparent hover:border-white/20 transition-all">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-2 flex items-center"><i className="fa-solid fa-star text-yellow-300 mr-2"></i> Mẹo nhỏ nè</h4>
              <p className="text-sm font-medium text-indigo-50 leading-relaxed mb-6 opacity-95">
                Sử dụng cấu trúc rõ ràng (Tiêu đề, gạch đầu dòng) sẽ giúp AI trả lời cực chuẩn.
              </p>
              <button 
                onClick={() => setShowTipModal(true)}
                className="flex items-center text-sm font-bold text-indigo-900 hover:text-indigo-700 cursor-pointer transition-colors bg-white px-5 py-3 rounded-full w-fit shadow-md hover:shadow-lg active:scale-95"
              >
                <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                Xem ví dụ mẫu
              </button>
            </div>
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute top-4 right-4 text-5xl opacity-20 rotate-12">
              <i className="fa-regular fa-lightbulb"></i>
            </div>
          </div>
        </div>
      </div>

      {/* CUTE TIP MODAL */}
      {showTipModal && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowTipModal(false)}>
           <div 
             className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in fade-in zoom-in duration-300 border-[6px] border-slate-100 dark:border-slate-700"
             onClick={e => e.stopPropagation()}
           >
              <button 
                onClick={() => setShowTipModal(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>

              <div className="text-center mb-8">
                 <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg border-4 border-white dark:border-slate-700">
                   <i className="fa-solid fa-lightbulb"></i>
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-white">Bí kíp dạy bé AI</h3>
              </div>

              <div className="space-y-4">
                 <div className="bg-indigo-50 dark:bg-slate-700 p-5 rounded-3xl flex gap-4 items-start border border-indigo-100 dark:border-slate-600">
                    <span className="text-indigo-600 dark:text-indigo-400 text-xl mt-0.5"><i className="fa-solid fa-check-circle"></i></span>
                    <div>
                       <h4 className="font-bold text-base text-slate-800 dark:text-white">Đặt tên file rõ ràng</h4>
                       <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">Ví dụ: Thay vì <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-600 text-slate-500 dark:text-slate-400">doc1.txt</span>, hãy đặt là <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-600 text-indigo-600 dark:text-indigo-400 font-bold">Chinh_sach.txt</span>.</p>
                    </div>
                 </div>

                 <div className="bg-purple-50 dark:bg-slate-700 p-5 rounded-3xl flex gap-4 items-start border border-purple-100 dark:border-slate-600">
                    <span className="text-purple-600 dark:text-purple-400 text-xl mt-0.5"><i className="fa-solid fa-list-check"></i></span>
                    <div>
                       <h4 className="font-bold text-base text-slate-800 dark:text-white">Dùng cấu trúc Q&A</h4>
                       <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-slate-600 font-mono leading-relaxed">
                         <span className="font-bold text-purple-600 dark:text-purple-400">Hỏi:</span> Shop mở cửa mấy giờ?<br/>
                         <span className="font-bold text-purple-600 dark:text-purple-400">Trả lời:</span> Dạ từ 8h - 22h ạ.
                       </div>
                    </div>
                 </div>

                 <div className="bg-teal-50 dark:bg-slate-700 p-5 rounded-3xl flex gap-4 items-start border border-teal-100 dark:border-slate-600">
                    <span className="text-teal-600 dark:text-teal-400 text-xl mt-0.5"><i className="fa-solid fa-scissors"></i></span>
                    <div>
                       <h4 className="font-bold text-base text-slate-800 dark:text-white">Chia nhỏ nội dung</h4>
                       <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">Đừng nhồi nhét quá nhiều vào 1 file. Chia nhỏ theo chủ đề sẽ giúp AI tìm kiếm nhanh hơn đó.</p>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setShowTipModal(false)}
                className="w-full mt-8 py-4 bg-slate-800 dark:bg-violet-600 text-white rounded-2xl font-bold hover:bg-slate-900 dark:hover:bg-violet-700 transition-colors shadow-xl active:scale-95 text-lg"
              >
                Đã hiểu rồi nha!
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
