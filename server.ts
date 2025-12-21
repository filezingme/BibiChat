
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
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
    const now = Date.now();
    
    fs.writeFileSync(DB_FILE, JSON.stringify({ 
      users: [
        { 
          id: 'admin', 
          email: 'admin@bibichat.io', 
          password: '123456', 
          role: 'master', 
          botSettings: { botName: 'BibiBot', primaryColor: '#ec4899', welcomeMessage: 'Xin chào! Mình là BibiBot đây.' },
          plugins: {
             autoOpen: { enabled: false, delay: 5 },
             social: { enabled: true, zalo: '0979116118', phone: '0979116118' },
             leadForm: { enabled: true, title: 'Để lại thông tin để được tư vấn kỹ hơn nha!', trigger: 'manual' }
          }
        }
      ], 
      documents: [],
      // Clean initialization without sample logs to avoid confusion
      chatLogs: [],
      leads: [],
      notifications: [
        { id: '1', userId: 'all', title: 'Bé AI đã học xong', desc: 'Dữ liệu "Chính sách đổi trả" đã được nạp thành công vào bộ nhớ.', time: Date.now() - 7200000, scheduledAt: Date.now() - 7200000, readBy: [], icon: 'fa-graduation-cap', color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
        { id: '2', userId: 'all', title: 'Hệ thống an toàn', desc: 'Dữ liệu của bạn được bảo vệ tuyệt đối an toàn với mã hóa 2 lớp.', time: Date.now() - 18000000, scheduledAt: Date.now() - 18000000, readBy: [], icon: 'fa-shield-heart', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
      ]
    }));
  }
};
initDB();

const getDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const saveDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// ... (Plugins, Leads, Notifications, Users APIs - Keep as is)
app.get('/api/plugins/:userId', (req, res) => {
    const db = getDB();
    const user = db.users.find((u: any) => u.id === req.params.userId);
    if (user) {
        const plugins = user.plugins || {
            autoOpen: { enabled: false, delay: 5 },
            social: { enabled: false, zalo: '', phone: '' },
            leadForm: { enabled: false, title: 'Nhập thông tin liên hệ', trigger: 'manual' }
        };
        res.json(plugins);
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/plugins/:userId', (req, res) => {
    const db = getDB();
    const userIndex = db.users.findIndex((u: any) => u.id === req.params.userId);
    if (userIndex !== -1) {
        db.users[userIndex].plugins = req.body;
        saveDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.get('/api/leads/:userId', (req, res) => {
    const db = getDB();
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string || '').toLowerCase().trim();
    
    let leads = (db.leads || []).filter((l: any) => l.userId === userId);
    
    if (search) {
        leads = leads.filter((l: any) => 
            (l.name && l.name.toLowerCase().includes(search)) || 
            (l.phone && String(l.phone).includes(search)) || 
            (l.email && l.email.toLowerCase().includes(search))
        );
    }
    
    leads.sort((a: any, b: any) => b.createdAt - a.createdAt);
    const total = leads.length;
    const startIndex = (page - 1) * limit;
    res.json({
        data: leads.slice(startIndex, startIndex + limit),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
});

app.post('/api/leads', (req, res) => {
    const db = getDB();
    const { userId, name, phone, email, isTest } = req.body;
    if (!db.leads) db.leads = [];
    const newLead = { id: Math.random().toString(36).substr(2, 9), userId, name, phone, email, source: 'chat_form', status: 'new', createdAt: Date.now(), isTest: !!isTest };
    db.leads.push(newLead);
    saveDB(db);
    res.json(newLead);
});

app.post('/api/leads/:id/status', (req, res) => {
    const db = getDB();
    const idx = (db.leads || []).findIndex((l: any) => l.id === req.params.id);
    if (idx !== -1) { db.leads[idx].status = req.body.status; saveDB(db); res.json({ success: true }); } 
    else { res.status(404).json({ success: false }); }
});

app.delete('/api/leads/:id', (req, res) => {
    const db = getDB();
    const initialLength = (db.leads || []).length;
    db.leads = (db.leads || []).filter((l: any) => l.id !== req.params.id);
    if (db.leads.length < initialLength) { saveDB(db); res.json({ success: true }); } 
    else { res.status(404).json({ success: false, message: 'Lead not found' }); }
});

// ... (Rest of Notification, User, Chat APIs remain the same)
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  const db = getDB();
  const now = Date.now();
  let notifs = (db.notifications || []).filter((n: any) => {
    const nUserId = String(n.userId || '').trim();
    const reqUserId = String(userId || '').trim();
    if (nUserId !== 'all' && nUserId !== reqUserId) return false;
    if (reqUserId === 'admin') return true;
    const scheduleTime = Number(n.scheduledAt || n.time || 0);
    return scheduleTime <= (now + 60000); 
  });
  notifs = notifs.map((n: any) => ({ ...n, isRead: Array.isArray(n.readBy) ? n.readBy.includes(userId) : (n.isRead || false) }));
  notifs.sort((a: any, b: any) => (b.scheduledAt || b.time) - (a.scheduledAt || a.time));
  res.json(notifs);
});
app.post('/api/notifications/:id/read', (req, res) => {
  const { userId } = req.body; 
  const db = getDB();
  const notif = (db.notifications || []).find((n: any) => n.id === req.params.id);
  if (notif) {
    if (!notif.readBy) notif.readBy = [];
    if (!notif.readBy.includes(userId)) notif.readBy.push(userId);
    saveDB(db);
    res.json({ success: true });
  } else res.status(404).json({ success: false });
});
app.post('/api/notifications/read-all', (req, res) => {
  const { userId } = req.body;
  const db = getDB();
  const now = Date.now();
  if (db.notifications) {
    db.notifications.forEach((n: any) => {
        const nUserId = String(n.userId || '').trim();
        const reqUserId = String(userId || '').trim();
        if ((nUserId === 'all' || nUserId === reqUserId) && (reqUserId === 'admin' || Number(n.scheduledAt || n.time) <= (now + 60000))) {
            if (!n.readBy) n.readBy = [];
            if (!n.readBy.includes(userId)) n.readBy.push(userId);
        }
    });
    saveDB(db);
  }
  res.json({ success: true });
});
app.post('/api/notifications/create', (req, res) => {
  const db = getDB();
  const scheduledTime = Number(req.body.scheduledAt) || Date.now();
  const newNotif = {
    id: Math.random().toString(36).substr(2, 9),
    userId: req.body.userId || 'all',
    title: req.body.title,
    desc: req.body.desc,
    time: scheduledTime,
    scheduledAt: scheduledTime, 
    readBy: [], 
    icon: req.body.icon || 'fa-bell',
    color: req.body.color || 'text-blue-500',
    bg: req.body.bg || 'bg-blue-100 dark:bg-blue-900/30'
  };
  if (!db.notifications) db.notifications = [];
  db.notifications.push(newNotif);
  saveDB(db);
  res.json(newNotif);
});

app.get('/api/users', (req, res) => {
  const db = getDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10000;
  const search = (req.query.search as string || '').toLowerCase();
  let filteredUsers = db.users;
  if (search) {
    filteredUsers = filteredUsers.filter((u: any) => u.email.toLowerCase().includes(search) || (u.botSettings?.botName || '').toLowerCase().includes(search));
  }
  const total = filteredUsers.length;
  if (!req.query.page && !req.query.limit) return res.json(filteredUsers);
  const startIndex = (page - 1) * limit;
  res.json({ data: filteredUsers.slice(startIndex, startIndex + limit), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// 1. Get Paginated Sessions (Grouped logs)
app.get('/api/chat-sessions/:userId', (req, res) => {
    const { userId } = req.params; // 'all' (Admin) or specific user ID
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filterUserId = req.query.filterUserId as string || 'all'; 

    let allLogs = db.chatLogs || [];

    if (userId !== 'all') {
        allLogs = allLogs.filter((l: any) => l.userId === userId);
    } else {
        if (filterUserId !== 'all') {
            allLogs = allLogs.filter((l: any) => l.userId === filterUserId);
        }
    }

    const sessionsMap: Record<string, any> = {};
    allLogs.forEach((log: any) => {
        const sessId = log.customerSessionId || 'legacy_session';
        const key = `${log.userId}_${sessId}`; 
        
        if (!sessionsMap[key]) {
            sessionsMap[key] = {
                uniqueKey: key,
                sessionId: sessId,
                userId: log.userId,
                lastActive: log.timestamp,
                preview: log.query,
                messageCount: 0
            };
        }
        sessionsMap[key].messageCount++;
        if (log.timestamp > sessionsMap[key].lastActive) {
            sessionsMap[key].lastActive = log.timestamp;
            sessionsMap[key].preview = log.query;
        }
    });

    const sessions = Object.values(sessionsMap).sort((a: any, b: any) => b.lastActive - a.lastActive);
    const total = sessions.length;
    const startIndex = (page - 1) * limit;
    const paginatedSessions = sessions.slice(startIndex, startIndex + limit);

    res.json({
        data: paginatedSessions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
});

app.get('/api/chat-messages/:userId/:sessionId', (req, res) => {
    const { userId, sessionId } = req.params;
    const db = getDB();
    const messages = (db.chatLogs || []).filter((l: any) => 
        (userId === 'all' || l.userId === userId) && 
        (l.customerSessionId === sessionId || (sessionId === 'legacy_session' && !l.customerSessionId))
    );
    messages.sort((a: any, b: any) => a.timestamp - b.timestamp);
    res.json(messages);
});

app.get('/api/chat-logs/:userId', (req, res) => {
    const { userId } = req.params;
    const db = getDB();
    let logs = db.chatLogs || [];
    if (userId !== 'all') logs = logs.filter((l: any) => l.userId === userId);
    res.json(logs); 
});

app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  if (db.users.find((u: any) => u.email === email)) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
  const newUser = { id: Math.random().toString(36).substr(2, 9), email, password, role: 'user', createdAt: Date.now(), botSettings: { botName: 'Trợ lý AI', primaryColor: '#8b5cf6', welcomeMessage: 'Chào mừng bạn đến với hỗ trợ trực tuyến!', position: 'right', avatarUrl: '' }, plugins: { autoOpen: { enabled: false, delay: 5 }, social: { enabled: false, zalo: '', phone: '' }, leadForm: { enabled: true, title: 'Nhập thông tin', trigger: 'manual' } } };
  db.users.push(newUser);
  saveDB(db);
  res.json({ success: true, user: newUser });
});
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  const user = db.users.find((u: any) => u.email === email && u.password === password);
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });
});
app.post('/api/user/change-password', (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const db = getDB();
  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'User không tồn tại' });
  if (db.users[idx].password !== oldPassword) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
  db.users[idx].password = newPassword;
  saveDB(db);
  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});
app.post('/api/admin/reset-password', (req, res) => {
  const { targetUserId, newPassword } = req.body;
  const db = getDB();
  const idx = db.users.findIndex((u: any) => u.id === targetUserId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'User không tồn tại' });
  db.users[idx].password = newPassword;
  saveDB(db);
  res.json({ success: true, message: 'Reset mật khẩu thành công' });
});
app.delete('/api/admin/users/:id', (req, res) => {
  const db = getDB();
  const initialLen = db.users.length;
  db.users = db.users.filter((u: any) => u.id !== req.params.id);
  if (db.users.length === initialLen) return res.status(404).json({ success: false });
  const userDocs = db.documents.filter((d: any) => d.userId === req.params.id);
  userDocs.forEach((doc: any) => { if (doc.path && fs.existsSync(doc.path)) try { fs.unlinkSync(doc.path); } catch(e) {} });
  db.documents = db.documents.filter((d: any) => d.userId !== req.params.id);
  db.chatLogs = db.chatLogs.filter((l: any) => l.userId !== req.params.id);
  db.leads = (db.leads || []).filter((l: any) => l.userId !== req.params.id);
  saveDB(db);
  res.json({ success: true, message: 'Xóa user thành công' });
});
app.get('/api/documents/:userId', (req, res) => {
  const db = getDB();
  res.json(db.documents.filter((d: any) => d.userId === req.params.userId));
});
app.get('/api/settings/:userId', (req, res) => {
  const db = getDB();
  const user = db.users.find((u: any) => u.id === req.params.userId);
  user ? res.json(user.botSettings) : res.status(404).json({ success: false });
});
app.post('/api/settings/:userId', (req, res) => {
  const db = getDB();
  const idx = db.users.findIndex((u: any) => u.id === req.params.userId);
  if (idx !== -1) { db.users[idx].botSettings = req.body; saveDB(db); res.json({ success: true }); } 
  else res.status(404).json({ success: false });
});
app.post('/api/documents/text', (req, res) => {
  const { name, content, userId } = req.body;
  const db = getDB();
  const newDoc = { id: Math.random().toString(36).substr(2, 9), userId, name, content, type: 'text', status: 'indexed', createdAt: Date.now() };
  db.documents.push(newDoc);
  saveDB(db);
  res.json(newDoc);
});
app.post('/api/documents/upload', upload.single('file') as any, (req: any, res: any) => {
  const file = (req as any).file;
  if (!file || !req.body.userId) return res.status(400).send('Missing file/userId');
  const db = getDB();
  const newDoc = { id: Math.random().toString(36).substr(2, 9), userId: req.body.userId, name: file.originalname, content: fs.readFileSync(file.path, 'utf-8'), path: file.path, type: 'file', status: 'indexed', createdAt: Date.now() };
  db.documents.push(newDoc);
  saveDB(db);
  res.json(newDoc);
});
app.delete('/api/documents/:id', (req, res) => {
  const db = getDB();
  const doc = db.documents.find((d: any) => d.id === req.params.id);
  if (doc && doc.path && fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
  db.documents = db.documents.filter((d: any) => d.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});
app.post('/api/chat', async (req, res) => {
  const { message, userId, botName, sessionId } = req.body;
  const db = getDB();
  if (!process.env.API_KEY) return res.status(500).json({ error: "Missing API KEY" });
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = db.documents.filter((d: any) => d.userId === userId).map((d: any) => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
  const systemInstruction = `Bạn là trợ lý AI tên "${botName || 'BibiBot'}". Dữ liệu: ${context}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: message, config: { systemInstruction } });
    const reply = response.text || "Tôi không thể trả lời.";
    if (!db.chatLogs) db.chatLogs = [];
    db.chatLogs.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        userId, 
        customerSessionId: sessionId || 'anon', 
        query: message, 
        answer: reply, 
        timestamp: Date.now(), 
        tokens: message.length, 
        isSolved: !reply.includes("không có thông tin") 
    });
    saveDB(db);
    res.json({ text: reply });
  } catch (error) { res.status(500).json({ error: "AI Error" }); }
});

app.listen(PORT, () => {
  console.log(`SaaS Backend running at http://localhost:${PORT}`);
});
