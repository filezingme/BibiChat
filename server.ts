
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';

const app = express();
const PORT = 3001;

// Cấu hình CORS để cho phép các website khác gọi API của bạn
app.use(cors({
  origin: '*', // Trong môi trường Production, hãy thay '*' bằng danh sách domain cụ thể của khách hàng
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use(express.json() as any);

const DB_FILE = './db.json';
const initDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ 
      users: [
        { id: 'admin', email: 'admin@bibichat.io', password: '123456', role: 'master', botSettings: { botName: 'BibiBot', primaryColor: '#ec4899', welcomeMessage: 'Xin chào! Mình là BibiBot đây.' } }
      ], 
      documents: [],
      chatLogs: []
    }));
  }
};
initDB();

const getDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const saveDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API: Lấy danh sách Users (Cho Master)
app.get('/api/users', (req, res) => {
  const db = getDB();
  res.json(db.users);
});

// API: Đăng ký
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  
  if (db.users.find((u: any) => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
  }

  const newUser = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    password,
    role: 'user',
    createdAt: Date.now(),
    botSettings: {
      botName: 'Trợ lý AI',
      primaryColor: '#8b5cf6',
      welcomeMessage: 'Chào mừng bạn đến với hỗ trợ trực tuyến!',
      position: 'right',
      avatarUrl: ''
    }
  };
  
  db.users.push(newUser);
  saveDB(db);
  res.json({ success: true, user: newUser });
});

// API: Đăng nhập
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  const user = db.users.find((u: any) => u.email === email && u.password === password);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });
  }
});

// API: Đổi mật khẩu (User tự đổi)
app.post('/api/user/change-password', (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const db = getDB();
  const userIndex = db.users.findIndex((u: any) => u.id === userId);

  if (userIndex === -1) return res.status(404).json({ success: false, message: 'User không tồn tại' });
  
  if (db.users[userIndex].password !== oldPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
  }

  db.users[userIndex].password = newPassword;
  saveDB(db);
  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

// API: Reset mật khẩu (Admin thực hiện)
app.post('/api/admin/reset-password', (req, res) => {
  const { targetUserId, newPassword } = req.body;
  const db = getDB();
  const userIndex = db.users.findIndex((u: any) => u.id === targetUserId);

  if (userIndex === -1) return res.status(404).json({ success: false, message: 'User không tồn tại' });

  db.users[userIndex].password = newPassword;
  saveDB(db);
  res.json({ success: true, message: 'Reset mật khẩu thành công' });
});

// API: Xóa User (Admin thực hiện)
app.delete('/api/admin/users/:id', (req, res) => {
  const db = getDB();
  const targetId = req.params.id;

  const initialUserCount = db.users.length;
  db.users = db.users.filter((u: any) => u.id !== targetId);

  if (db.users.length === initialUserCount) {
    return res.status(404).json({ success: false, message: 'User không tồn tại' });
  }

  const userDocs = db.documents.filter((d: any) => d.userId === targetId);
  userDocs.forEach((doc: any) => {
    if (doc.path && fs.existsSync(doc.path)) {
      try { fs.unlinkSync(doc.path); } catch(e) {}
    }
  });
  db.documents = db.documents.filter((d: any) => d.userId !== targetId);
  db.chatLogs = db.chatLogs.filter((l: any) => l.userId !== targetId);

  saveDB(db);
  res.json({ success: true, message: 'Xóa user thành công' });
});

// API: Lấy tài liệu của riêng User
app.get('/api/documents/:userId', (req, res) => {
  const db = getDB();
  const userDocs = db.documents.filter((d: any) => d.userId === req.params.userId);
  res.json(userDocs);
});

// API: Lấy cấu hình Widget (Cho Widget nhúng) - QUAN TRỌNG
app.get('/api/settings/:userId', (req, res) => {
  const db = getDB();
  const user = db.users.find((u: any) => u.id === req.params.userId);
  if (user) {
    res.json(user.botSettings);
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// API: Lưu cấu hình Widget cho User
app.post('/api/settings/:userId', (req, res) => {
  const db = getDB();
  const userIndex = db.users.findIndex((u: any) => u.id === req.params.userId);
  if (userIndex !== -1) {
    db.users[userIndex].botSettings = req.body;
    saveDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// API: Thêm tài liệu văn bản
app.post('/api/documents/text', (req, res) => {
  const { name, content, userId } = req.body;
  const db = getDB();
  const newDoc = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    name,
    content,
    type: 'text',
    status: 'indexed',
    createdAt: Date.now()
  };
  db.documents.push(newDoc);
  saveDB(db);
  res.json(newDoc);
});

// API: Upload tệp
app.post('/api/documents/upload', upload.single('file') as any, (req: any, res: any) => {
  const file = (req as any).file;
  const { userId } = req.body;
  if (!file || !userId) return res.status(400).send('Missing file or userId.');
  
  const content = fs.readFileSync(file.path, 'utf-8');
  const db = getDB();
  const newDoc = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    name: file.originalname,
    content: content,
    path: file.path,
    type: 'file',
    status: 'indexed',
    createdAt: Date.now()
  };
  db.documents.push(newDoc);
  saveDB(db);
  res.json(newDoc);
});

// API: Xóa tài liệu
app.delete('/api/documents/:id', (req, res) => {
  const db = getDB();
  const doc = db.documents.find((d: any) => d.id === req.params.id);
  if (doc && doc.path && fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
  db.documents = db.documents.filter((d: any) => d.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// API: Chat AI
app.post('/api/chat', async (req, res) => {
  const { message, userId, botName } = req.body;
  const db = getDB();

  if (!process.env.API_KEY) return res.status(500).json({ error: "Missing API KEY" });

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = db.documents
    .filter((d: any) => d.userId === userId)
    .map((d: any) => `[Tài liệu: ${d.name}]\n${d.content}`)
    .join('\n\n');

  const systemInstruction = `Bạn là trợ lý AI tên "${botName || 'BibiBot'}". Hãy dùng kiến thức sau để hỗ trợ khách hàng: ${context}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: { systemInstruction }
    });
    
    const reply = response.text || "Tôi không thể trả lời.";

    if (!db.chatLogs) db.chatLogs = [];
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      customerSessionId: 'anon-session',
      query: message,
      answer: reply,
      timestamp: Date.now(),
      tokens: message.length + reply.length,
      isSolved: !reply.includes("không có thông tin") && !reply.includes("Xin lỗi")
    };
    db.chatLogs.push(newLog);
    saveDB(db);

    res.json({ text: reply });
  } catch (error) {
    res.status(500).json({ error: "AI Error" });
  }
});

// --- SERVE WIDGET.JS (VANILLA JS IMPLEMENTATION) ---
app.get('/widget.js', (req, res) => {
  const script = `
    (function() {
      // 1. Get Config
      var config = window.BibiChatConfig;
      if (!config || !config.widgetId) {
        console.error("BibiChat: widgetId not found");
        return;
      }

      var API_BASE = "http://localhost:3001"; // Or your deployed domain
      var userId = config.widgetId;
      var settings = {
        primaryColor: '#8b5cf6',
        botName: 'Support Bot',
        welcomeMessage: 'Hi there!',
        position: 'right'
      };

      // 2. Load Settings from Server
      fetch(API_BASE + '/api/settings/' + userId)
        .then(response => {
          if(response.ok) return response.json();
          return settings;
        })
        .then(data => {
          settings = { ...settings, ...data };
          initWidget();
        })
        .catch(err => {
          console.warn("BibiChat: Could not load settings, using defaults.");
          initWidget();
        });

      function initWidget() {
        // 3. Inject Styles
        var style = document.createElement('style');
        style.innerHTML = \`
          #bibichat-container { font-family: 'Segoe UI', sans-serif; position: fixed; bottom: 20px; \${settings.position}: 20px; z-index: 99999; }
          #bibichat-btn { 
            width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.25); 
            background: \${settings.primaryColor}; cursor: pointer; display: flex; align-items: center; justify-content: center; 
            transition: transform 0.2s; border: none;
          }
          #bibichat-btn:hover { transform: scale(1.05); }
          #bibichat-btn svg { width: 30px; height: 30px; fill: white; }
          
          #bibichat-box {
            position: fixed; bottom: 90px; \${settings.position}: 20px; width: 350px; height: 500px; max-height: 80vh;
            background: white; border-radius: 20px; box-shadow: 0 5px 25px rgba(0,0,0,0.15);
            display: none; flex-direction: column; overflow: hidden; animation: bibiSlideUp 0.3s ease-out;
            border: 1px solid #f0f0f0;
          }
          @keyframes bibiSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          
          #bibichat-header {
            padding: 15px; background: \${settings.primaryColor}; color: white; display: flex; align-items: center; gap: 10px;
          }
          #bibichat-header-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          #bibichat-header-text h3 { margin: 0; font-size: 16px; font-weight: 700; }
          #bibichat-header-text span { font-size: 12px; opacity: 0.9; }

          #bibichat-messages { flex: 1; overflow-y: auto; padding: 15px; background: #f9fafb; display: flex; flex-direction: column; gap: 10px; }
          .bibi-msg { max-width: 80%; padding: 10px 14px; font-size: 14px; line-height: 1.4; border-radius: 12px; }
          .bibi-msg.user { align-self: flex-end; background: \${settings.primaryColor}; color: white; border-bottom-right-radius: 2px; }
          .bibi-msg.bot { align-self: flex-start; background: white; color: #333; border: 1px solid #e5e7eb; border-top-left-radius: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          
          #bibichat-input-area { padding: 10px; background: white; border-top: 1px solid #f0f0f0; display: flex; gap: 8px; }
          #bibichat-input { flex: 1; border: 1px solid #e5e7eb; border-radius: 20px; padding: 10px 15px; outline: none; font-size: 14px; }
          #bibichat-input:focus { border-color: \${settings.primaryColor}; }
          #bibichat-send { width: 40px; height: 40px; border-radius: 50%; background: \${settings.primaryColor}; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
          #bibichat-send svg { width: 16px; height: 16px; fill: white; }
          .bibi-loading span { display: inline-block; width: 6px; height: 6px; background: #ccc; border-radius: 50%; margin: 0 2px; animation: bibiBounce 0.6s infinite alternate; }
          .bibi-loading span:nth-child(2) { animation-delay: 0.2s; }
          .bibi-loading span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes bibiBounce { from { transform: translateY(0); } to { transform: translateY(-5px); } }
        \`;
        document.head.appendChild(style);

        // 4. Create DOM
        var container = document.createElement('div');
        container.id = 'bibichat-container';
        
        var btn = document.createElement('button');
        btn.id = 'bibichat-btn';
        btn.innerHTML = '<svg viewBox="0 0 512 512"><path d="M123.6 391.3c12.9-9.4 29.6-11.8 44.6-6.4c26.5 9.6 56.2 15.1 87.8 15.1c124.7 0 208-80.5 208-160s-83.3-160-208-160S48 160.5 48 240c0 32 12.4 62.8 35.7 89.2c8.6 9.7 12.8 22.5 11.8 35.5c-1.4 18.1-5.7 34.7-11.3 49.4c17-7.9 31.1-16.7 39.4-22.7zM21.2 431.9c1.8-2.7 3.5-5.4 5.1-8.1c10-16.6 19.5-38.4 21.4-62.9C17.4 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208s-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6c-15.1 6.6-32.3 12.6-50.1 16.1c-.8 .2-1.6 .3-2.4 .5c-4.4 .8-8.7 1.5-13.2 1.9c-.2 0-.5 .1-.7 .1c-5.1 .5-10.2 .8-15.3 .8c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c4.1-4.2 7.8-8.7 11.3-13.5z"/></svg>';
        
        var box = document.createElement('div');
        box.id = 'bibichat-box';
        box.innerHTML = \`
          <div id="bibichat-header">
            <div id="bibichat-header-icon"><svg viewBox="0 0 512 512" style="width:24px;height:24px;fill:white;"><path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"/></svg></div>
            <div id="bibichat-header-text">
              <h3>\${settings.botName}</h3>
              <span>Online</span>
            </div>
            <div style="margin-left:auto;cursor:pointer;" id="bibichat-close">✕</div>
          </div>
          <div id="bibichat-messages">
            <div class="bibi-msg bot">\${settings.welcomeMessage}</div>
          </div>
          <div id="bibichat-input-area">
            <input type="text" id="bibichat-input" placeholder="Type a message..." />
            <button id="bibichat-send"><svg viewBox="0 0 512 512"><path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"/></svg></button>
          </div>
        \`;

        container.appendChild(btn);
        container.appendChild(box);
        document.body.appendChild(container);

        // 5. Logic
        var isOpen = false;
        var messagesDiv = document.getElementById('bibichat-messages');
        var input = document.getElementById('bibichat-input');
        var sendBtn = document.getElementById('bibichat-send');

        btn.onclick = toggleChat;
        document.getElementById('bibichat-close').onclick = toggleChat;

        function toggleChat() {
          isOpen = !isOpen;
          box.style.display = isOpen ? 'flex' : 'none';
          btn.style.display = isOpen ? 'none' : 'flex';
          if(isOpen) input.focus();
        }

        function appendMsg(text, type) {
          var div = document.createElement('div');
          div.className = 'bibi-msg ' + type;
          div.textContent = text;
          messagesDiv.appendChild(div);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function appendLoading() {
          var div = document.createElement('div');
          div.className = 'bibi-msg bot bibi-loading';
          div.id = 'bibi-loading-msg';
          div.innerHTML = '<span></span><span></span><span></span>';
          messagesDiv.appendChild(div);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function removeLoading() {
          var el = document.getElementById('bibi-loading-msg');
          if(el) el.remove();
        }

        async function sendMessage() {
          var text = input.value.trim();
          if(!text) return;
          
          appendMsg(text, 'user');
          input.value = '';
          appendLoading();

          try {
            var res = await fetch(API_BASE + '/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                message: text,
                botName: settings.botName
              })
            });
            var data = await res.json();
            removeLoading();
            if(data.text) appendMsg(data.text, 'bot');
            else appendMsg("Sorry, I encountered an error.", 'bot');
          } catch(e) {
            removeLoading();
            appendMsg("Connection error.", 'bot');
          }
        }

        sendBtn.onclick = sendMessage;
        input.onkeypress = function(e) { if(e.key === 'Enter') sendMessage(); }
      }
    })();
  `;
  res.set('Content-Type', 'application/javascript');
  res.send(script);
});

app.listen(PORT, () => {
  console.log(`SaaS Backend running at http://localhost:${PORT}`);
});
