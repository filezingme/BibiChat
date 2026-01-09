import express, { RequestHandler, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Buffer } from 'buffer';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// ===============================
// ES MODULE PATH RESOLUTION
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app); // Wrap express in HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8 
} as any);

const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'bibichat_secret';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);

app.use(express.json({ limit: '100mb' }) as any);
app.use(express.urlencoded({ limit: '100mb', extended: true }) as any);

// ===============================
// SERVE FRONTEND (VITE BUILD)
// ===============================
const frontendDistPath = path.join(__dirname, '../dist');

app.use(express.static(frontendDistPath));

// --- MONGODB OPTIMIZATION ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bibichat_local";

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 100,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
} as any)
  .then(() => console.log('✅ Đã kết nối cơ sở dữ liệu thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// --- JWT HELPER FUNCTIONS ---
const generateToken = (user: any) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// --- AUTH MIDDLEWARE (EXPRESS) ---
type AuthRequest = any;

const authenticateToken = (req: AuthRequest, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
        req.user = user;
        next();
    });
};

// --- SECURE SOCKET MIDDLEWARE ---
io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: No token provided"));

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) return next(new Error("Authentication error: Invalid token"));
        (socket as any).user = decoded;
        next();
    });
});

const onlineUsers = new Map<string, string>();

io.on('connection', (socket: any) => {
  const userId = socket.user.id;
  if (userId) {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    console.log(`⚡ User connected: ${socket.user.email}`);
  }
  socket.on('disconnect', () => {
    if (userId) onlineUsers.delete(userId);
  });
});

// --- SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true }, 
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user', index: true },
  createdAt: { type: Number, default: Date.now },
  botSettings: {
    botName: { type: String, default: 'Trợ lý AI' },
    primaryColor: { type: String, default: '#8b5cf6' },
    welcomeMessage: { type: String, default: 'Xin chào! Tôi có thể giúp gì cho bạn?' },
    position: { type: String, default: 'bottom-right' },
    avatarUrl: { type: String, default: '' }
  },
  plugins: {
    autoOpen: { enabled: { type: Boolean, default: false }, delay: { type: Number, default: 5 } },
    social: { enabled: { type: Boolean, default: false }, zalo: String, phone: String },
    leadForm: { enabled: { type: Boolean, default: false }, title: String, trigger: String }
  }
});

const documentSchema = new mongoose.Schema({ id: String, userId: String, name: String, content: String, type: String, status: String, createdAt: Number });
const chatLogSchema = new mongoose.Schema({ id: String, userId: String, customerSessionId: String, query: String, answer: String, timestamp: Number, tokens: Number, isSolved: Boolean });
const leadSchema = new mongoose.Schema({ id: String, userId: String, name: String, phone: String, email: String, source: String, status: String, createdAt: Number, isTest: Boolean });
const notificationSchema = new mongoose.Schema({ id: String, userId: String, title: String, desc: String, time: Number, scheduledAt: Number, readBy: [String], icon: String, color: String, bg: String });
const directMessageSchema = new mongoose.Schema({ id: String, senderId: String, receiverId: String, content: String, timestamp: Number, isRead: Boolean, type: String, replyToId: String, reactions: [], groupId: String });

const User = mongoose.model('User', userSchema);
const Document = mongoose.model('Document', documentSchema);
const ChatLog = mongoose.model('ChatLog', chatLogSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);

// --- INIT ADMIN USER ---
const initDB = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log("🔥 Initializing Database...");
    const hashedPassword = await bcrypt.hash('bangkieu', 10);
    await User.create({
      id: 'admin',
      email: 'admin@bibichat.me',
      password: hashedPassword,
      role: 'master',
      createdAt: Date.now(),
      botSettings: { botName: 'BibiBot', primaryColor: '#ec4899', welcomeMessage: 'Xin chào Admin!' },
      plugins: {
         autoOpen: { enabled: false, delay: 5 },
         social: { enabled: true, zalo: '0979116118', phone: '0979116118' },
         leadForm: { enabled: true, title: 'Để lại thông tin nhé!', trigger: 'manual' }
      }
    } as any);
    console.log("✅ Admin Created: admin@bibichat.me / bangkieu");
  }
};
initDB();

const upload = multer({ storage: multer.memoryStorage() });

// --- WIDGET SCRIPT ---
app.get('/widget.js', (req, res) => {
  const scriptContent = `
(function() {
  if (window.BibiChatLoaded) return;
  window.BibiChatLoaded = true;
  var config = window.BibiChatConfig || {};
  var widgetId = config.widgetId;
  if (!widgetId) return;
  var container = document.createElement('div');
  container.id = 'bibichat-widget-container';
  container.style.position = 'fixed';
  container.style.zIndex = '2147483647';
  container.style.bottom = '20px';
  container.style.right = '20px'; 
  container.style.width = '100px';
  container.style.height = '100px';
  container.style.border = 'none';
  container.style.pointerEvents = 'none';
  var clientUrl = '${CLIENT_URL}'.replace(/\\/$/, '');
  var iframe = document.createElement('iframe');
  iframe.src = clientUrl + '?mode=embed&userId=' + widgetId;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.allow = "microphone";
  iframe.style.pointerEvents = 'auto'; 
  container.appendChild(iframe);
  document.body.appendChild(container);
  window.addEventListener('message', function(event) {
    if (event.data === 'bibichat-open') {
       container.style.pointerEvents = 'auto';
       if(window.innerWidth < 480) {
         container.style.width = 'calc(100vw - 32px)'; container.style.height = 'calc(100dvh - 32px)'; 
         container.style.left = '16px'; container.style.bottom = '16px';
       } else { container.style.width = '380px'; container.style.height = '600px'; }
    } else if (event.data === 'bibichat-close') {
       container.style.width = '100px'; container.style.height = '100px'; container.style.pointerEvents = 'none'; 
    }
  });
})();`;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(scriptContent);
});

// --- PUBLIC ROUTES ---
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({ status: dbState === 1 ? 'ok' : 'error', message: dbState === 1 ? 'DB Connected' : 'DB Error' });
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ id: randomUUID(), email, password: hashedPassword, role: 'user', createdAt: Date.now() } as any) as any;
        const token = generateToken(newUser);
        res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role }, token });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });
        const token = generateToken(user);
        res.json({ success: true, user: { id: user.id, email: user.email, role: user.role, botSettings: user.botSettings, plugins: user.plugins }, token });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Public read for Widget
app.get('/api/settings/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId }).select('botSettings').lean();
    res.json(user ? user.botSettings : {});
});
app.get('/api/plugins/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId }).select('plugins').lean();
    res.json(user ? user.plugins : {});
});

// AI Chat (Public but requires internal API Key env)
app.post('/api/chat', async (req, res) => {
    const { message, userId, botName, sessionId } = req.body;
    if (!process.env.API_KEY) return res.status(500).json({ error: "Missing API KEY" });
    try {
        const docs = await Document.find({ userId }).lean();
        const context = docs.map((d: any) => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
        const systemInstruction = `Bạn là trợ lý AI tên "${botName || 'BibiBot'}". Hãy sử dụng kiến thức sau để hỗ trợ khách hàng: ${context}`;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: message, config: { systemInstruction } });
        const reply = response.text || "Tôi không thể trả lời.";
        await ChatLog.create({ id: randomUUID(), userId, customerSessionId: sessionId || 'anon', query: message, answer: reply, timestamp: Date.now(), tokens: message.length, isSolved: !reply.includes("không có thông tin") } as any);
        res.json({ text: reply });
    } catch (error) { res.status(500).json({ error: "AI Error" }); }
});

// Public Lead Submission
app.post('/api/leads', async (req, res) => {
    const { userId, name, phone, email, isTest } = req.body;
    try {
        const lead = await Lead.create({ id: randomUUID(), userId, name, phone, email, source: 'widget', status: 'new', createdAt: Date.now(), isTest } as any);
        // Emit to owner
        io.to(userId).emit('notification', { 
            id: randomUUID(), userId, title: 'Khách hàng mới', desc: `${name} vừa để lại SĐT`, time: Date.now(), isRead: false, icon: 'fa-user-plus', color: 'text-emerald-500', bg: 'bg-emerald-100' 
        });
        res.json(lead);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// --- AUTHENTICATED ROUTES ---

// 1. Settings & Plugins
app.post('/api/settings/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if(req.user.id !== req.params.userId && req.user.role !== 'master') return res.status(403).json({});
    await User.findOneAndUpdate({ id: req.params.userId }, { $set: { botSettings: req.body } }, { upsert: true });
    res.json({ success: true });
});

app.post('/api/plugins/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if(req.user.id !== req.params.userId && req.user.role !== 'master') return res.status(403).json({});
    await User.findOneAndUpdate({ id: req.params.userId }, { $set: { plugins: req.body } }, { upsert: true });
    res.json({ success: true });
});

// 2. Notifications
app.post('/api/notifications/create', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if(req.user.role !== 'master') return res.status(403).json({ error: 'Admin only' });
    const { title, desc, icon, color, bg, userId, scheduledAt } = req.body;
    const notifId = randomUUID();
    const newNotif = { id: notifId, userId: userId === 'all' ? 'system' : userId, title, desc, time: scheduledAt || Date.now(), readBy: [], icon, color, bg };
    
    await Notification.create(newNotif as any);
    
    // Broadcast via Socket
    if (userId === 'all') io.emit('notification', newNotif);
    else io.to(userId).emit('notification', newNotif);
    
    res.json({ success: true });
});

app.get('/api/notifications/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { userId } = req.params;
    // Get system notifications OR user specific ones
    const notifs = await Notification.find({ 
        $or: [{ userId: 'system' }, { userId: userId }] 
    }).sort({ time: -1 }).limit(50).lean();
    
    // Map read status based on readBy array
    const mapped = notifs.map((n: any) => ({
        ...n,
        isRead: n.readBy.includes(userId)
    }));
    res.json(mapped);
});

app.post('/api/notifications/:id/read', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { userId } = req.body;
    await Notification.findOneAndUpdate({ id: req.params.id }, { $addToSet: { readBy: userId } });
    res.json({ success: true });
});

app.post('/api/notifications/read-all', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { userId } = req.body;
    await Notification.updateMany(
        { $or: [{ userId: 'system' }, { userId: userId }] }, 
        { $addToSet: { readBy: userId } }
    );
    res.json({ success: true });
});

// 3. Leads Management
app.get('/api/leads/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query: any = { userId: req.params.userId };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    
    const [total, leads] = await Promise.all([
        Lead.countDocuments(query),
        Lead.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit).lean()
    ]);
    res.json({ data: leads, pagination: { total, totalPages: Math.ceil(total / +limit) } });
});

app.post('/api/leads/:id/status', authenticateToken as any, async (req: AuthRequest, res: any) => {
    await Lead.findOneAndUpdate({ id: req.params.id }, { status: req.body.status });
    res.json({ success: true });
});

app.delete('/api/leads/:id', authenticateToken as any, async (req: AuthRequest, res: any) => {
    await Lead.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
});

// 4. Documents
app.get('/api/documents/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const docs = await Document.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
    res.json(docs);
});

app.post('/api/documents/text', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { name, content, userId } = req.body;
    const doc = await Document.create({ id: randomUUID(), userId, name, content, type: 'text', status: 'indexed', createdAt: Date.now() } as any);
    res.json(doc);
});

app.delete('/api/documents/:id', authenticateToken as any, async (req: AuthRequest, res: any) => {
    await Document.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
});

// 5. Chat History & Stats
app.get('/api/chat-logs/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    // Basic stats aggregation
    const query = req.params.userId === 'all' ? {} : { userId: req.params.userId };
    const logs = await ChatLog.find(query).sort({ timestamp: -1 }).limit(1000).lean();
    res.json(logs);
});

app.get('/api/chat-sessions/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { page = 1, limit = 10, filterUserId } = req.query;
    const matchStage: any = {};
    if (req.params.userId !== 'all') matchStage.userId = req.params.userId;
    if (filterUserId && filterUserId !== 'all') matchStage.userId = filterUserId;

    const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { timestamp: -1 } },
        { $group: {
            _id: "$customerSessionId",
            userId: { $first: "$userId" },
            lastActive: { $first: "$timestamp" },
            preview: { $first: "$query" },
            messageCount: { $sum: 1 }
        }},
        { $sort: { lastActive: -1 } },
        { $skip: (+page - 1) * +limit },
        { $limit: +limit }
    ];
    
    // Note: Pagination count requires separate aggregation or simplification for MVP
    const sessions = await ChatLog.aggregate(pipeline);
    const total = await ChatLog.distinct("customerSessionId", matchStage);
    
    res.json({ 
        data: sessions.map((s: any) => ({ ...s, uniqueKey: s._id, sessionId: s._id })), 
        pagination: { total: total.length, totalPages: Math.ceil(total.length / +limit) } 
    });
});

app.get('/api/chat-messages/:userId/:sessionId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const logs = await ChatLog.find({ customerSessionId: req.params.sessionId }).sort({ timestamp: 1 }).lean();
    res.json(logs);
});

// 6. User Management (Admin)
app.get('/api/users', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query: any = { role: { $ne: 'master' } };
    if (search) query.$or = [{ email: { $regex: search, $options: 'i' } }];
    
    const [total, users] = await Promise.all([
        User.countDocuments(query),
        User.find(query).select('-password').skip((+page - 1) * +limit).limit(+limit).lean()
    ]);
    res.json({ data: users, pagination: { total, totalPages: Math.ceil(total / +limit) } });
});

app.delete('/api/admin/users/:id', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Admin only' });
    const uid = req.params.id;
    await Promise.all([User.findOneAndDelete({ id: uid }), Document.deleteMany({ userId: uid }), ChatLog.deleteMany({ userId: uid }), Lead.deleteMany({ userId: uid })]);
    res.json({ success: true });
});

app.post('/api/admin/reset-password', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Admin only' });
    const { targetUserId, newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ id: targetUserId }, { password: hashed });
    res.json({ success: true });
});

app.post('/api/user/change-password', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findOne({ id: req.user.id });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

app.post('/api/upload/proxy', authenticateToken as any, upload.single('file') as any, async (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    res.json({ url: `data:${req.file.mimetype};base64,${b64}` });
});

// --- NEW DM ROUTES TO PREVENT CRASH ---

// Find User for DM
app.post('/api/dm/find', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('id email role');
    if (!user) return res.json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
});

// Get Conversations (Last message per user)
app.get('/api/dm/conversations/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { userId } = req.params;
    
    const conversations = await DirectMessage.aggregate([
        { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
        { $sort: { timestamp: -1 } },
        {
            $group: {
                _id: { $cond: { if: { $eq: ["$senderId", userId] }, then: "$receiverId", else: "$senderId" } },
                lastMessage: { $first: "$content" },
                lastMessageTime: { $first: "$timestamp" },
                type: { $first: "$type" },
                isRead: { $first: "$isRead" },
                senderId: { $first: "$senderId" }
            }
        }
    ]);

    const results = await Promise.all(conversations.map(async (conv) => {
        const user = await User.findOne({ id: conv._id }).select('id email role');
        if (!user) return null;
        const unreadCount = await DirectMessage.countDocuments({ senderId: conv._id, receiverId: userId, isRead: false });
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            lastMessage: conv.type === 'image' ? '[Hình ảnh]' : (conv.type === 'sticker' ? '[Sticker]' : conv.lastMessage),
            lastMessageTime: conv.lastMessageTime,
            unreadCount
        };
    }));

    res.json(results.filter(r => r !== null).sort((a: any, b: any) => b.lastMessageTime - a.lastMessageTime));
});

// Get Messages History
app.get('/api/dm/history/:userId/:otherUserId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { userId, otherUserId } = req.params;
    if (req.user.id !== userId && req.user.id !== 'admin' && req.user.role !== 'master') return res.status(403).json({ error: "Unauthorized" });

    await DirectMessage.updateMany({ senderId: otherUserId, receiverId: userId, isRead: false }, { isRead: true });
    
    const messages = await DirectMessage.find({
        $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
        ]
    }).sort({ timestamp: 1 }).limit(200).lean(); // Limit history
    res.json(messages);
});

// Send Message
app.post('/api/dm/send', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { receiverId, content, type, replyToId, groupId } = req.body;
    const senderId = req.user.id; 

    const newMessage = await DirectMessage.create({
        id: randomUUID(),
        senderId, receiverId, content, timestamp: Date.now(), isRead: false,
        type: type || 'text', replyToId: replyToId || null, reactions: [], groupId: groupId || null
    } as any);

    const payload = { ... (newMessage as any).toObject(), replyToContent: null };
    io.to(receiverId).emit('direct_message', payload);
    io.to(senderId).emit('message_sent', payload); // For multi-tab sync

    res.json(newMessage);
});

// Unread Count
app.get('/api/dm/unread/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const count = await DirectMessage.countDocuments({ receiverId: req.params.userId, isRead: false });
    res.json({ count });
});

// React
app.post('/api/dm/react', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { messageId, userId, emoji } = req.body;
    const msg = await DirectMessage.findOne({ id: messageId });
    if (!msg) return res.status(404).json({ success: false });

    const existingIdx = msg.reactions.findIndex((r: any) => r.userId === userId);
    if (existingIdx > -1) {
        if (msg.reactions[existingIdx].emoji === emoji) msg.reactions.splice(existingIdx, 1);
        else msg.reactions[existingIdx].emoji = emoji;
    } else {
        msg.reactions.push({ userId, emoji });
    }
    msg.markModified('reactions');
    await msg.save();
    io.emit('message_reaction', { messageId, reactions: msg.reactions });
    res.json({ success: true });
});

// ===============================
// SPA FALLBACK (SERVE INDEX.HTML)
// ===============================
app.get('*', (req, res) => {
  const host = req.hostname;
  if (host.startsWith('api.')) return res.status(404).json({ error: 'API endpoint not found' });
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with Full Features Enabled`);
});