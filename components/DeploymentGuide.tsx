
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
        <h2 className="text-3xl font-bold mb-4 text-slate-800 dark:text-white">Hướng dẫn Deploy & Cấu hình</h2>
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
                 <li>Nhấn nút <strong>Create API key</strong> &rarr; <strong>Create API key in new project</strong>.</li>
                 <li>Copy chuỗi ký tự bắt đầu bằng <code>AIza...</code> (Lưu lại để dùng ở Bước 4).</li>
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
                 <li>Chọn <strong>Create Service</strong> &rarr; <strong>GitHub</strong> &rarr; Chọn repository của bạn.</li>
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
                 <li>Vào <strong>vercel.com</strong> &rarr; Add New Project &rarr; Import GitHub Repo &rarr; Deploy!</li>
              </ul>
            </div>
          </div>

          {/* Step 4: Add Env Vars */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">4</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Quan trọng: Thêm API Key vào Vercel</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Để chat hoạt động ngay cả khi Backend chưa sẵn sàng.</p>
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                 <li>Trong Dashboard dự án trên Vercel, vào tab <strong>Settings</strong>.</li>
                 <li>Chọn mục <strong>Environment Variables</strong>.</li>
                 <li>Thêm biến mới:
                    <ul className="ml-4 mt-1 font-mono text-xs bg-slate-100 p-2 rounded">
                        <li>Key: <strong>API_KEY</strong></li>
                        <li>Value: (Key Gemini của bạn)</li>
                    </ul>
                 </li>
                 <li>Nhấn <strong>Save</strong>.</li>
                 <li>Vào tab <strong>Deployments</strong>, nhấn dấu 3 chấm ở bản build mới nhất &rarr; <strong>Redeploy</strong> để áp dụng key.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mt-8 shadow-xl">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><i className="fa-solid fa-bolt"></i> Mẹo xử lý lỗi</h3>
        <p className="opacity-90 text-sm leading-relaxed">
          Nếu bạn gặp lỗi "Thiếu API Key", hãy chắc chắn bạn đã thực hiện <strong>Bước 4</strong> và Redeploy lại nhé! Bạn cũng có thể mở Console trình duyệt (F12) và nhập lệnh sau để test nhanh không cần deploy: <br/>
          <code className="bg-black/30 px-2 py-1 rounded mt-2 inline-block">localStorage.setItem('API_KEY', 'your-key')</code>
        </p>
      </div>
    </div>
  );
};

export default DeploymentGuide;
