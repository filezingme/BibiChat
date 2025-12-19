
import React from 'react';

const DeploymentGuide: React.FC = () => {
  const codeBlock = (code: string) => (
    <div className="bg-gray-900 rounded-lg p-4 my-4 overflow-x-auto">
      <pre className="text-green-400 font-mono text-sm"><code>{code}</code></pre>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-10 animate-in fade-in duration-500 pb-20">
      <section>
        <h2 className="text-3xl font-bold mb-4 text-slate-800 dark:text-white">Hướng dẫn Triển khai SaaS Full-stack</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Ứng dụng giờ đây bao gồm cả Frontend (React) và Backend (Node.js/Express) với hệ thống lưu trữ file thực tế.</p>
        
        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cài đặt Dependencies</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mở terminal và cài đặt các thư viện cho cả server và client.</p>
              {codeBlock(`npm install express cors multer @google/genai`)}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Chạy Backend Server</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Backend sẽ chạy tại cổng 3001, xử lý AI và lưu trữ file vào thư mục /uploads.</p>
              {codeBlock(`# Terminal 1:\nexport API_KEY="YOUR_GEMINI_KEY"\nnpx tsx server.ts`)}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Chạy Frontend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Frontend sẽ giao tiếp với Backend tại localhost:3001.</p>
              {codeBlock(`# Terminal 2:\nnpm run dev`)}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      <section>
        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">Cấu trúc Dữ liệu SaaS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <h4 className="font-bold mb-2 text-slate-800 dark:text-white">/uploads</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Thư mục này chứa các tệp tin thực tế (.txt, .pdf...) mà người dùng đã upload lên từ Dashboard.</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <h4 className="font-bold mb-2 text-slate-800 dark:text-white">db.json</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Đóng vai trò như Database, lưu trữ thông tin về tệp tin, người dùng và các cấu hình widget.</p>
          </div>
        </div>
      </section>

      <div className="bg-blue-600 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2">Lưu ý quan trọng cho Production</h3>
        <p className="opacity-80 text-sm">
          Khi triển khai lên server thật (VPS), bạn nên thay thế <code>db.json</code> bằng một database thực thụ như <strong>MongoDB</strong> hoặc <strong>PostgreSQL</strong> để đảm bảo hiệu năng và tính nhất quán dữ liệu.
        </p>
      </div>
    </div>
  );
};

export default DeploymentGuide;
