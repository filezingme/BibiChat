
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { User, Lead } from '../types';

interface Props {
  user: User;
}

const Leads: React.FC<Props> = ({ user }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const LIMIT = 10;

  // Changed: Use a state to track which ID is in "Confirm Delete" mode instead of window.confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Custom Dropdown State
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Debounce search to avoid spamming server
    const delayDebounceFn = setTimeout(() => {
        setPage(1); // Reset to page 1 on new search
        loadLeads(1, searchTerm);
    }, 300); // Reduced to 300ms

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        clearTimeout(delayDebounceFn);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user.id, searchTerm]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setPage(newPage);
          loadLeads(newPage, searchTerm);
      }
  };

  // Auto reset delete confirmation after 3 seconds if not clicked
  useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      if (confirmDeleteId) {
          timer = setTimeout(() => setConfirmDeleteId(null), 3000);
      }
      return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const loadLeads = async (currentPage: number, search: string) => {
    setIsLoading(true);
    try {
        const result = await apiService.getLeadsPaginated(user.id, currentPage, LIMIT, search);
        setLeads(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalLeads(result.pagination.total);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus as any } : l));
      setOpenDropdownId(null);
      await apiService.updateLeadStatus(id, newStatus);
  };

  // Improved Delete Logic: 2-Step Confirmation
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Stop row clicks
      
      if (confirmDeleteId === id) {
          // Second click: Actually delete
          executeDelete(id);
      } else {
          // First click: Show confirmation state
          setConfirmDeleteId(id);
      }
  };

  const executeDelete = async (id: string) => {
      try {
          // Optimistic update
          setLeads(prev => prev.filter(l => l.id !== id));
          setConfirmDeleteId(null);
          
          await apiService.deleteLead(id);
          // Reload to keep pagination sync in case of page boundary
          loadLeads(page, searchTerm);
      } catch (error) {
          console.error("Failed to delete lead:", error);
          alert("Không thể xóa bản ghi này. Vui lòng thử lại.");
          loadLeads(page, searchTerm); // Revert if failed
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'new': return { label: 'Mới tinh', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: 'fa-star' };
          case 'contacted': return { label: 'Đang chat', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: 'fa-comments' };
          case 'converted': return { label: 'Chốt đơn', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: 'fa-check-circle' };
          case 'test': return { label: 'Dữ liệu Test', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: 'fa-flask' };
          default: return { label: 'Khác', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: 'fa-circle' };
      }
  };

  // Helper component for Status Dropdown Content to reuse in both Mobile and Desktop
  const StatusDropdownContent: React.FC<{ leadId: string }> = ({ leadId }) => (
      <>
        <button onClick={() => updateStatus(leadId, 'new')} className="w-full text-left px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-2">
            <i className="fa-solid fa-star w-4"></i> Mới tinh
        </button>
        <button onClick={() => updateStatus(leadId, 'contacted')} className="w-full text-left px-4 py-3 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700">
            <i className="fa-solid fa-comments w-4"></i> Đang chat
        </button>
        <button onClick={() => updateStatus(leadId, 'converted')} className="w-full text-left px-4 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700">
            <i className="fa-solid fa-check-circle w-4"></i> Chốt đơn
        </button>
        <button onClick={() => updateStatus(leadId, 'test')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700">
            <i className="fa-solid fa-flask w-4"></i> Dữ liệu Test
        </button>
      </>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12" ref={dropdownRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <span className="w-12 h-12 bg-pink-100 dark:bg-pink-900/50 text-pink-500 dark:text-pink-300 rounded-2xl flex items-center justify-center text-xl shadow-sm rotate-3 border-2 border-pink-200">
                 <i className="fa-solid fa-address-book"></i>
              </span>
              Danh sách Khách hàng
           </h2>
           <p className="text-slate-500 dark:text-slate-400 font-bold ml-1 mt-1">
              Tổng cộng: {totalLeads} khách hàng
           </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
               <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-pink-500 transition-colors"></i>
               <input 
                 type="text" 
                 placeholder="Tìm tên, SĐT..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:border-pink-300 dark:focus:border-pink-700 text-sm font-bold text-slate-700 dark:text-white transition-all"
               />
            </div>
            <button onClick={() => loadLeads(page, searchTerm)} className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all border-2 border-transparent hover:border-pink-100">
                <i className={`fa-solid fa-rotate ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden p-2">
         
         {/* Combined Table View (Mobile + Desktop) */}
         <div className="overflow-x-auto min-h-[300px] w-full">
            <table className="w-full text-left border-separate border-spacing-y-2 min-w-[900px]">
               <thead>
                  <tr className="bg-indigo-50/50 dark:bg-slate-700/50">
                     <th className="px-4 py-4 md:px-6 md:py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-l-2xl pl-8 whitespace-nowrap">
                        <i className="fa-solid fa-user-tag mr-2 text-indigo-400"></i> Họ tên
                     </th>
                     <th className="px-4 py-4 md:px-6 md:py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                        <i className="fa-solid fa-address-card mr-2 text-purple-400"></i> Liên hệ
                     </th>
                     <th className="px-4 py-4 md:px-6 md:py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                        <i className="fa-solid fa-share-nodes mr-2 text-pink-400"></i> Nguồn
                     </th>
                     <th className="px-4 py-4 md:px-6 md:py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 whitespace-nowrap">
                        <i className="fa-solid fa-clock mr-2 text-amber-400"></i> Thời gian
                     </th>
                     <th className="px-4 py-4 md:px-6 md:py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 text-left whitespace-nowrap">
                        <i className="fa-solid fa-heart mr-2 text-rose-400"></i> Trạng thái
                     </th>
                     <th className="px-4 py-4 md:px-6 md:py-5 text-sm font-black text-indigo-900/70 dark:text-indigo-200 rounded-r-2xl pr-8 text-right whitespace-nowrap">
                        <i className="fa-solid fa-gear mr-2 text-slate-400"></i> Tùy chọn
                     </th>
                  </tr>
               </thead>
               <tbody className="space-y-2">
                  {isLoading ? (
                      // Skeleton Loading Rows
                      [...Array(5)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                              <td className="px-6 py-5 rounded-l-2xl pl-8"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
                              <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div><div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-32"></div></td>
                              <td className="px-6 py-5"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-16"></div></td>
                              <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div></td>
                              <td className="px-6 py-5"><div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-full w-24"></div></td>
                              <td className="px-6 py-5 rounded-r-2xl"><div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full ml-auto"></div></td>
                          </tr>
                      ))
                  ) : leads.length === 0 ? (
                     <tr>
                        <td colSpan={6} className="px-8 py-24 text-center">
                           <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                                 <i className="fa-solid fa-folder-open text-3xl"></i>
                              </div>
                              <p className="font-bold text-slate-500">Chưa có khách hàng nào để lại thông tin.</p>
                           </div>
                        </td>
                     </tr>
                  ) : (
                      leads.map(lead => {
                         const statusStyle = getStatusBadge(lead.status);
                         const isConfirming = confirmDeleteId === lead.id;
                         
                         return (
                            <tr key={lead.id} className="bg-white dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-colors group rounded-2xl">
                                <td className="px-4 py-4 md:px-6 md:py-5 rounded-l-2xl pl-8 font-bold text-slate-800 dark:text-white border-b border-slate-50 dark:border-slate-700/50 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 text-white flex items-center justify-center font-bold text-sm shadow-md">
                                        {lead.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span>{lead.name}</span>
                                    </div>
                                </div>
                                </td>
                                <td className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-50 dark:border-slate-700/50 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200"><i className="fa-solid fa-phone text-xs text-slate-400 mr-1.5"></i>{lead.phone}</span>
                                    {lead.email && <span className="text-xs font-bold text-slate-500"><i className="fa-solid fa-envelope text-xs text-slate-400 mr-1.5"></i>{lead.email}</span>}
                                </div>
                                </td>
                                <td className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-50 dark:border-slate-700/50 whitespace-nowrap">
                                <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg text-slate-500 uppercase tracking-wider">
                                    {lead.source}
                                </span>
                                </td>
                                <td className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-50 dark:border-slate-700/50 text-sm font-bold text-slate-500 whitespace-nowrap">
                                {new Date(lead.createdAt).toLocaleString('vi-VN')}
                                </td>
                                <td className="px-4 py-4 md:px-6 md:py-5 text-left border-b border-slate-50 dark:border-slate-700/50 relative whitespace-nowrap">
                                    {/* Cute Custom Dropdown */}
                                    <div className="relative">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === lead.id ? null : lead.id); }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all active:scale-95 ${statusStyle.color}`}
                                        >
                                            <i className={`fa-solid ${statusStyle.icon}`}></i>
                                            {statusStyle.label}
                                            <i className="fa-solid fa-chevron-down text-[10px] ml-1 opacity-60"></i>
                                        </button>

                                        {openDropdownId === lead.id && (
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                <StatusDropdownContent leadId={lead.id} />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 md:px-6 md:py-5 rounded-r-2xl pr-8 text-right border-b border-slate-50 dark:border-slate-700/50 whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-4">
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteClick(e, lead.id)}
                                            className={`h-9 shrink-0 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90 font-bold text-xs border ${
                                                isConfirming 
                                                ? 'w-auto px-3 bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse' 
                                                : 'w-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200'
                                            }`}
                                            title="Xóa khách hàng"
                                        >
                                            {isConfirming ? (
                                                <>
                                                    <i className="fa-solid fa-circle-question mr-1"></i> Xóa?
                                                </>
                                            ) : (
                                                <i className="fa-solid fa-trash-can text-sm"></i>
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                         );
                      })
                  )}
               </tbody>
            </table>
         </div>
         
         {/* Pagination Controls */}
         {totalLeads > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-slate-50 dark:border-slate-700/50 gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600">
                        Đang xem <span className="text-indigo-600 dark:text-indigo-400 mx-1">{((page - 1) * LIMIT) + 1} - {Math.min(page * LIMIT, totalLeads)}</span> 
                        trên tổng <span className="text-slate-800 dark:text-white mx-1">{totalLeads}</span>
                    </span>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => handlePageChange(page - 1)} 
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-100"
                    >
                        Trước
                    </button>
                    <button 
                        onClick={() => handlePageChange(page + 1)} 
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-100"
                    >
                        Sau
                    </button>
                </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default Leads;
