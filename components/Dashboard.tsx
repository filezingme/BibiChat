
import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface Props {
  user: User;
  initialSelectedUser?: string;
}

const Dashboard: React.FC<Props> = ({ user, initialSelectedUser = 'all' }) => {
  const isMaster = user.role === 'master';
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [selectedUser, setSelectedUser] = useState<string>(initialSelectedUser);
  const [customers, setCustomers] = useState<User[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedUser(initialSelectedUser);
  }, [initialSelectedUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMaster) {
      apiService.getAllUsers().then(users => {
        // Chỉ hiển thị tài khoản khách hàng (loại bỏ admin/master)
        setCustomers(users.filter(u => u.role !== 'master'));
      });
    }
    loadStats();
  }, [period, selectedUser, user.id]);

  const loadStats = async () => {
    setIsLoading(true);
    const targetId = isMaster ? selectedUser : user.id;
    // Removed artificial delay
    const data = await apiService.getStats(targetId as any, period);
    setStats(data);
    setIsLoading(false);
  };

  const totalQueries = stats.reduce((acc, curr) => acc + curr.queries, 0);
  const totalSolved = stats.reduce((acc, curr) => acc + curr.solved, 0);
  const successRate = totalQueries > 0 ? Math.round((totalSolved / totalQueries) * 100) : 0;

  const getSelectedUserLabel = () => {
    if (selectedUser === 'all') return 'Toàn bộ hệ thống';
    const found = customers.find(c => c.id === selectedUser);
    return found ? found.email : 'Unknown';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2 flex items-center gap-3">
            <span className="text-3xl animate-bounce">📊</span> Hiệu suất AI
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 font-bold">
            {isMaster && selectedUser !== 'all' 
              ? `Đang xem: ${customers.find(c => c.id === selectedUser)?.email}` 
              : 'Theo dõi sự chăm chỉ của AI theo thời gian thực.'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
          {isMaster && (
            <div className="relative flex-1 lg:flex-none w-full lg:w-72 z-20" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-bold hover:border-indigo-400 transition-all text-slate-700 dark:text-slate-200 shadow-sm"
              >
                <span className="truncate">{getSelectedUserLabel()}</span>
                <i className={`fa-solid fa-chevron-down text-xs transition-transform text-slate-400 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-200 z-50">
                  <div 
                    onClick={() => { setSelectedUser('all'); setIsDropdownOpen(false); }}
                    className={`px-5 py-4 text-sm font-bold cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 transition-colors ${selectedUser === 'all' ? 'bg-indigo-50 dark:bg-slate-600 text-indigo-600 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Toàn bộ hệ thống
                  </div>
                  {customers.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setSelectedUser(c.id); setIsDropdownOpen(false); }}
                      className={`px-5 py-4 text-sm font-bold cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 border-t border-slate-100 dark:border-slate-600 transition-colors ${selectedUser === c.id ? 'bg-indigo-50 dark:bg-slate-600 text-indigo-600 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {c.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex bg-slate-100 dark:bg-slate-700/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-inner">
            {(['hour', 'day', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                  period === p ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-slate-200'
                }`}
              >
                {p === 'hour' ? 'Giờ' : p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards - Colorful Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            label: 'Tổng lượt hỏi', 
            value: totalQueries, 
            icon: 'fa-solid fa-comments', 
            bg: 'bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-800',
            iconBg: 'bg-blue-600 shadow-lg shadow-blue-500/40',
            text: 'text-blue-700 dark:text-blue-400',
            border: 'border-blue-200 dark:border-slate-700'
          },
          { 
            label: 'Đã giải quyết', 
            value: `${successRate}%`, 
            icon: 'fa-solid fa-wand-magic-sparkles', 
            bg: 'bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-800',
            iconBg: 'bg-emerald-600 shadow-lg shadow-emerald-500/40',
            text: 'text-emerald-700 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-slate-700'
          },
          { 
            label: 'Cần hỗ trợ', 
            value: totalQueries - totalSolved, 
            icon: 'fa-solid fa-headset', 
            bg: 'bg-gradient-to-br from-orange-50 to-white dark:from-slate-800 dark:to-slate-800',
            iconBg: 'bg-orange-500 shadow-lg shadow-orange-500/40',
            text: 'text-orange-600 dark:text-orange-400',
            border: 'border-orange-200 dark:border-slate-700'
          },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border-2 ${stat.border} flex items-center space-x-6 hover:-translate-y-2 transition-all duration-300 group`}>
            <div className={`w-20 h-20 rounded-[1.5rem] ${stat.iconBg} flex items-center justify-center shrink-0 text-white text-3xl group-hover:scale-110 group-hover:rotate-6 transition-transform border-4 border-white dark:border-slate-700`}>
              <i className={`${stat.icon}`}></i>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className={`text-5xl font-black ${stat.text}`}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Card */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border-2 border-slate-100 dark:border-slate-700 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Biểu đồ tăng trưởng</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Xu hướng câu hỏi theo thời gian</p>
          </div>
          <div className="flex items-center space-x-6 bg-slate-50 dark:bg-slate-700/50 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-600">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50"></span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tổng lượt hỏi</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-teal-500 rounded-full shadow-sm shadow-teal-500/50"></span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Đã giải quyết</span>
            </div>
          </div>
        </div>
        
        <div className="h-[450px] w-full relative z-10">
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center animate-bounce mb-4">
                 <i className="fa-solid fa-robot text-indigo-500 text-3xl"></i>
              </div>
              <p className="text-base font-bold text-slate-500 dark:text-slate-400 animate-pulse">Đang phân tích dữ liệu...</p>
            </div>
          ) : stats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                {/* Dynamic grid color via CSS var or simple toggle, here using a darker stroke for dark mode context */}
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 13, fontWeight: 700}} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 13, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '4 4'}}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', 
                    padding: '16px 20px',
                    fontWeight: 700,
                    fontSize: '14px',
                    backgroundColor: '#1e293b',
                    color: '#f8fafc'
                  }}
                  itemStyle={{ paddingBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="queries" 
                  name="Tổng lượt hỏi"
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorQueries)" 
                  strokeWidth={5} 
                  activeDot={{r: 8, strokeWidth: 4, stroke:'#fff', fill: '#4f46e5'}} 
                />
                <Area 
                  type="monotone" 
                  dataKey="solved" 
                  name="Đã giải quyết"
                  stroke="#14b8a6" 
                  fillOpacity={1} 
                  fill="url(#colorSolved)" 
                  strokeWidth={5} 
                  activeDot={{r: 8, strokeWidth: 4, stroke:'#fff', fill: '#0d9488'}}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
               <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6">
                 <i className="fa-solid fa-chart-line text-4xl text-slate-400 dark:text-slate-500"></i>
               </div>
               <p className="text-xl font-bold">Chưa có dữ liệu nào</p>
               <p className="text-base mt-2">Hệ thống sẽ hiển thị biểu đồ khi có tương tác.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
