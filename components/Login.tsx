
import React, { useState } from 'react';
import { apiService } from '../services/apiService';

interface Props {
  onLogin: (user: any) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let result;
      if (isRegister) {
        result = await apiService.register(email, password);
      } else {
        result = await apiService.login(email, password);
      }

      if (result.success) {
        if (isRegister) {
          setIsRegister(false);
          setError('Đăng ký thành công! Đăng nhập đi nè.');
        } else {
          // Token is saved inside apiService.login/register
          onLogin(result.user);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Huhu, có lỗi gì đó rồi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f2f5] p-6 font-sans relative overflow-hidden">
      {/* Background Decor - Vibrant Mesh */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
         <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-pink-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-[420px] w-full bg-white p-10 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border-2 border-white/50 relative z-10 transition-all hover:scale-[1.01]">
        <div className="text-center mb-10">
          <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-pink-400 to-violet-500 rounded-[2rem] flex items-center justify-center text-white text-4xl shadow-2xl shadow-pink-400/50 mb-6 transform -rotate-6 hover:rotate-6 transition-transform cursor-pointer border-[6px] border-white">
            <i className="fa-solid fa-comment-dots"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
            {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại!'}
          </h2>
          <p className="text-slate-500 font-bold text-base">BibiChat - Trợ lý AI Siêu Cute</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`p-4 rounded-2xl text-sm font-bold flex items-center ${error.includes('thành công') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              <i className={`fa-solid ${error.includes('thành công') ? 'fa-check-circle' : 'fa-circle-exclamation'} mr-3 text-lg`}></i>
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="group">
              <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2 ml-3">Email của bạn</label>
              <div className="relative">
                <div className="absolute left-2 top-2 w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-500 z-10 border border-pink-100">
                   <i className="fa-solid fa-envelope"></i>
                </div>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng nhập email hợp lệ nhé!')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className="block w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-pink-100 focus:border-pink-500 outline-none text-base font-bold text-slate-800 placeholder:text-slate-400 transition-all" 
                  placeholder="Nhập địa chỉ email" 
                />
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2 ml-3">Mật khẩu</label>
              <div className="relative">
                 <div className="absolute left-2 top-2 w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-500 z-10 border border-pink-100">
                   <i className="fa-solid fa-lock"></i>
                </div>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Đừng quên nhập mật khẩu nha!')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className="block w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-pink-100 focus:border-pink-500 outline-none text-base font-bold text-slate-800 placeholder:text-slate-400 transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-pink-300/40 transform hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : (isRegister ? 'Đăng ký ngay' : 'Vào Dashboard')}
            {!isLoading && <i className="fa-solid fa-arrow-right"></i>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-sm font-bold">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button 
              onClick={() => { setIsRegister(!isRegister); setError(''); }} 
              className="ml-2 text-pink-500 hover:text-pink-600 font-black hover:underline"
            >
              {isRegister ? 'Đăng nhập' : 'Đăng ký miễn phí'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
