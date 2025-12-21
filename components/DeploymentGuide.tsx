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
        <h2 className="text-3xl font-bold mb-4 text-slate-800 dark:text-white">Hướng dẫn Deploy Miễn Phí (Tốc độ cao)</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Combo tối ưu nhất hiện nay: Frontend (Vercel) + Backend (Koyeb) + Database (MongoDB Atlas).</p>
        
        <div className="space-y-8">
          {/* Step 0: API Key */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold">0</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Lấy API Key Gemini (Miễn phí)</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Trí tuệ nhân tạo từ Google.</p>
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                 <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline font-bold">Google AI Studio</a>.</li>
                 <li>Đăng nhập bằng Gmail của bạn.</li>
                 <li>Nhấn nút <strong>Create API key</strong> -> <strong>Create API key in new project</strong>.</li>
                 <li>Copy chuỗi ký tự bắt đầu bằng <code>AIza...</code> (Lưu lại để dùng ở Bước 2).</li>
              </ul>
            </div>
          </div>

          {/* Step 1: Database */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">1</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tạo Database MongoDB Atlas</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Lưu trữ dữ liệu vĩnh viễn.</p>
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                 <li>Đăng ký tại <strong>mongodb.com/atlas</strong> (Chọn gói Free M0).</li>
                 <li>Tạo Cluster, vào phần <strong>Network Access</strong> chọn "Allow Access from Anywhere" (0.0.0.0/0).</li>
                 <li>Vào <strong>Database Access</strong> tạo user/password.</li>
                 <li>Lấy chuỗi kết nối (Connection String) dạng: <code>mongodb+srv://user:pass@...</code></li>
              </ul>
            </div>
          </div>

          {/* Step 2: Backend */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">2</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Deploy Backend lên Koyeb</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chạy server Node.js nhanh hơn, không bị ngủ đông.</p>
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                 <li>Push code lên GitHub.</li>
                 <li>Đăng ký tài khoản tại <strong>app.koyeb.com</strong>.</li>
                 <li>Chọn <strong>Create Service</strong> -> <strong>GitHub</strong> -> Chọn repository của bạn.</li>
                 <li>Trong phần <strong>Builder</strong>, chọn "Buildpack" (Mặc định).</li>
                 <li>Trong phần <strong>Environment variables</strong>, thêm:
                    <ul className="ml-4 mt-1 font-mono text-xs bg-slate-100 p-2 rounded">
                        <li>API_KEY = (Key Gemini vừa lấy ở Bước 0)</li>
                        <li>MONGODB_URI = (Chuỗi kết nối lấy ở Bước 1)</li>
                        <li>PORT = 8000</li>
                    </ul>
                 </li>
                 <li>Nhấn <strong>Deploy</strong>. Koyeb sẽ tự động phát hiện lệnh start trong package.json.</li>
                 <li>Copy "Public URL" (dạng <code>https://...koyeb.app</code>).</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Frontend */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">3</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Deploy Frontend lên Vercel</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Giao diện người dùng siêu tốc.</p>
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                 <li>Vào code, mở file <code>services/apiService.ts</code>.</li>
                 <li>Sửa dòng <code>API_URL</code> thành URL của Koyeb vừa copy ở bước 2.</li>
                 <li>Commit và Push code lên GitHub.</li>
                 <li>Vào <strong>vercel.com</strong> -> Add New Project -> Import GitHub Repo -> Deploy!</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mt-8 shadow-xl">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><i className="fa-solid fa-bolt"></i> Tại sao chọn Koyeb?</h3>
        <p className="opacity-90 text-sm leading-relaxed">
          Koyeb cung cấp gói miễn phí với hạ tầng tốt hơn Render cho các ứng dụng chat. Server không bị "ngủ sâu" (deep sleep), giúp tin nhắn đầu tiên của khách hàng được phản hồi ngay lập tức thay vì phải chờ đợi.
        </p>
      </div>
    </div>
  );
};

export default DeploymentGuide;