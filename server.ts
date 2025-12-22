
import express, { RequestHandler } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// URL của Frontend (Vercel) để nhúng vào Iframe. Mặc định là localhost nếu chạy local.
// Trên Koyeb, bạn cần set biến môi trường CLIENT_URL = https://your-frontend.vercel.app
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);

// INCREASED LIMIT FOR IMAGES
app.use(express.json({ limit: '50mb' }) as any);
app.use(express.urlencoded({ limit: '50mb', extended: true }) as any);

// --- MONGODB CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bibichat_local";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Đã kết nối cơ sở dữ liệu thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// --- SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true }, 
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Number, default: Date.now },
  botSettings: {
    botName: { type: String, default: 'Trợ lý AI' },
    primaryColor: { type: String, default: '#8b5cf6' },
    welcomeMessage: { type: String, default: 'Xin chào! Tôi có thể giúp gì cho bạn?' },
    position: { type: String, default: 'right' },
    avatarUrl: { type: String, default: '' }
  },
  plugins: {
    autoOpen: { enabled: { type: Boolean, default: false }, delay: { type: Number, default: 5 } },
    social: { enabled: { type: Boolean, default: false }, zalo: String, phone: String },
    leadForm: { enabled: { type: Boolean, default: false }, title: String, trigger: String }
  }
});

const documentSchema = new mongoose.Schema({
  id: String,
  userId: String,
  name: String,
  content: String,
  type: String,
  status: String,
  createdAt: Number
});

const chatLogSchema = new mongoose.Schema({
  id: String,
  userId: String,
  customerSessionId: String,
  query: String,
  answer: String,
  timestamp: Number,
  tokens: Number,
  isSolved: Boolean
});

const leadSchema = new mongoose.Schema({
  id: String,
  userId: String,
  name: String,
  phone: String,
  email: String,
  source: String,
  status: String,
  createdAt: Number,
  isTest: Boolean
});

const notificationSchema = new mongoose.Schema({
  id: String,
  userId: String,
  title: String,
  desc: String,
  time: Number,
  scheduledAt: Number,
  readBy: [String],
  icon: String,
  color: String,
  bg: String
});

const directMessageSchema = new mongoose.Schema({
  id: String,
  senderId: String,
  receiverId: String,
  content: String,
  timestamp: Number,
  isRead: { type: Boolean, default: false },
  type: { type: String, default: 'text' }, // text, sticker, image
  replyToId: String,
  reactions: [{ userId: String, emoji: String }]
});

// Models
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
    console.log("Initializing Admin User...");
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    await User.create({
      id: 'admin',
      email: 'admin@bibichat.io',
      password: '123456',
      role: 'master',
      botSettings: { botName: 'BibiBot', primaryColor: '#ec4899', welcomeMessage: 'Xin chào Admin!' },
      plugins: {
         autoOpen: { enabled: false, delay: 5 },
         social: { enabled: true, zalo: '0979116118', phone: '0979116118' },
         leadForm: { enabled: true, title: 'Để lại thông tin nhé!', trigger: 'manual' }
      }
    } as any);
    // Sample Notification - UPDATED TEXT
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    await Notification.create({
      id: '1', userId: 'all', title: 'Hệ thống sẵn sàng', desc: 'BibiChat đã kết nối cơ sở dữ liệu thành công!', 
      time: Date.now(), scheduledAt: Date.now(), readBy: [], icon: 'fa-rocket', color: 'text-emerald-500', bg: 'bg-emerald-100'
    } as any);
  }
};
initDB();

// Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// --- WIDGET SCRIPT SERVING (SAAS CORE) ---
app.get('/widget.js', (req, res) => {
  const scriptContent = `
(function() {
  if (window.BibiChatLoaded) return;
  window.BibiChatLoaded = true;

  var config = window.BibiChatConfig || {};
  var widgetId = config.widgetId;
  
  if (!widgetId) {
    console.error("BibiChat: widgetId is missing!");
    return;
  }

  var container = document.createElement('div');
  container.id = 'bibichat-widget-container';
  container.style.position = 'fixed';
  container.style.zIndex = '2147483647';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '80px';
  container.style.height = '80px';
  container.style.border = 'none';
  container.style.transition = 'all 0.3s ease';
  
  var iframe = document.createElement('iframe');
  iframe.src = '${CLIENT_URL}?mode=embed&userId=' + widgetId;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '20px';
  iframe.allow = "microphone";
  
  container.appendChild(iframe);
  document.body.appendChild(container);

  window.addEventListener('message', function(event) {
    if (event.data === 'bibichat-open') {
       container.style.width = '380px';
       container.style.height = '600px';
       container.style.borderRadius = '24px';
       container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
       if(window.innerWidth < 480) {
         container.style.width = '100%';
         container.style.height = '100%';
         container.style.bottom = '0';
         container.style.right = '0';
         container.style.borderRadius = '0';
       }
    } else if (event.data === 'bibichat-close') {
       container.style.width = '80px';
       container.style.height = '80px';
       container.style.borderRadius = '0';
       container.style.boxShadow = 'none';
       container.style.bottom = '20px';
       container.style.right = '20px';
    } else if (event.data && event.data.type === 'bibichat-position') {
       if (event.data.position === 'left') {
          container.style.left = '20px';
          container.style.right = 'auto';
       } else {
          container.style.right = '20px';
          container.style.left = 'auto';
       }
    }
  });
})();
  `;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(scriptContent);
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  res.json({ 
    status: dbState === 1 ? 'ok' : 'error', 
    dbState: dbState,
    message: dbState === 1 ? 'Đã kết nối cơ sở dữ liệu' : 'Mất kết nối cơ sở dữ liệu'
  });
});

// --- PROXY UPLOAD (Litterbox) ---
app.post('/api/upload/proxy', upload.single('file') as any, async (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('fileToUpload', blob, req.file.originalname);
        formData.append('reqtype', 'fileupload');
        formData.append('time', '24h'); // Temporary storage for 24 hours

        const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const url = await response.text();
        res.json({ url: url.trim() });
    } catch (error: any) {
        console.error('Proxy upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- API ROUTES ---

// PLUGINS
app.get('/api/plugins/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId });
    if (user) res.json(user.plugins);
    else res.status(404).json({ success: false });
});

app.post('/api/plugins/:userId', async (req, res) => {
    // Use $set to ensure fields are updated correctly even if nested schema changes
    await User.findOneAndUpdate(
        { id: req.params.userId }, 
        { $set: { plugins: req.body } }, 
        { new: true, upsert: true }
    );
    res.json({ success: true });
});

// LEADS
app.get('/api/leads/:userId', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string || '').toLowerCase();
    
    // START CHANGE: Handle 'all' userId for Master/Admin
    const query: any = {};
    if (userId !== 'all') {
        query.userId = userId;
    }
    // END CHANGE
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    res.json({
        data: leads,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
});

app.post('/api/leads', async (req, res) => {
    const { userId, name, phone, email, isTest } = req.body;
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    const newLead = await Lead.create({
        id: Math.random().toString(36).substr(2, 9),
        userId, name, phone, email, source: 'chat_form', status: 'new', createdAt: Date.now(), isTest: !!isTest
    } as any);
    res.json(newLead);
});

app.post('/api/leads/:id/status', async (req, res) => {
    await Lead.findOneAndUpdate({ id: req.params.id }, { status: req.body.status });
    res.json({ success: true });
});

app.delete('/api/leads/:id', async (req, res) => {
    await Lead.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
});

// NOTIFICATIONS
app.get('/api/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    const now = Date.now();
    
    let filter: any = {};

    if (userId === 'admin' || userId === 'master') {
        filter = {
            $or: [{ userId: 'all' }, { userId: 'admin' }]
        };
    } else {
        filter = {
            $and: [
                { $or: [{ userId: 'all' }, { userId: userId }] },
                { 
                    $or: [
                        { scheduledAt: { $lte: now + 60000 } },
                        { time: { $lte: now + 60000 } },
                        { scheduledAt: { $exists: false } }
                    ] 
                }
            ]
        };
    }

    const notifs = await Notification.find(filter).sort({ scheduledAt: -1, time: -1 });
    
    const mapped = notifs.map(n => ({
        ...n.toObject(),
        isRead: n.readBy.includes(userId)
    }));
    
    res.json(mapped);
});

app.post('/api/notifications/:id/read', async (req, res) => {
    await Notification.findOneAndUpdate(
        { id: req.params.id },
        { $addToSet: { readBy: req.body.userId } }
    );
    res.json({ success: true });
});

app.post('/api/notifications/read-all', async (req, res) => {
    const { userId } = req.body;
    const filter = { $or: [{ userId: 'all' }, { userId: userId }] };
    
    await Notification.updateMany(
        filter,
        { $addToSet: { readBy: userId } }
    );
    res.json({ success: true });
});

app.post('/api/notifications/create', async (req, res) => {
    const scheduledTime = Number(req.body.scheduledAt) || Date.now();
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    const newNotif = await Notification.create({
        id: Math.random().toString(36).substr(2, 9),
        userId: req.body.userId || 'all',
        title: req.body.title,
        desc: req.body.desc,
        time: scheduledTime,
        scheduledAt: scheduledTime,
        readBy: [],
        icon: req.body.icon || 'fa-bell',
        color: req.body.color || 'text-blue-500',
        bg: req.body.bg || 'bg-blue-100'
    } as any);
    res.json(newNotif);
});

// USERS
app.get('/api/users', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10000;
    const search = (req.query.search as string || '').toLowerCase();
    
    // START CHANGE: Filter out master/admin from customer list by default
    const query: any = { role: { $ne: 'master' } };
    
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: 'i' } },
            { 'botSettings.botName': { $regex: search, $options: 'i' } }
        ];
    }
    // END CHANGE
    
    const total = await User.countDocuments(query);
    const users = await User.find(query).skip((page - 1) * limit).limit(limit);
    
    res.json({ data: users, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// --- NEW DIRECT MESSAGE ROUTES ---

// Search User by Email
app.post('/api/dm/find', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('id email role');
    if (user) {
        res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
    } else {
        res.json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
});

// Get conversations list (Users you have talked to)
app.get('/api/dm/conversations/:userId', async (req, res) => {
    const { userId } = req.params;
    
    // Find all messages where user is sender or receiver
    const messages = await DirectMessage.find({
        $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ timestamp: -1 });

    const contactIds = new Set<string>();
    messages.forEach(m => {
        if (m.senderId !== userId) contactIds.add(m.senderId);
        if (m.receiverId !== userId) contactIds.add(m.receiverId);
    });

    const contacts = await User.find({ id: { $in: Array.from(contactIds) } }).select('id email role');
    
    // Map last message info AND unread count
    const conversations = await Promise.all(contacts.map(async contact => {
        const lastMsg = messages.find(m => 
            (m.senderId === userId && m.receiverId === contact.id) || 
            (m.senderId === contact.id && m.receiverId === userId)
        );
        
        // Count unread messages from this contact to current user
        const unreadCount = await DirectMessage.countDocuments({
            senderId: contact.id,
            receiverId: userId,
            isRead: false
        });

        // Determine preview text based on type
        let previewText = '';
        if (lastMsg) {
            if (lastMsg.type === 'sticker') previewText = '[Sticker]';
            else if (lastMsg.type === 'image') previewText = '[Hình ảnh]';
            else previewText = lastMsg.content || '';
        }

        return {
            id: contact.id,
            email: contact.email,
            role: contact.role,
            lastMessage: previewText,
            lastMessageTime: lastMsg?.timestamp || 0,
            unreadCount: unreadCount 
        };
    }));

    // Sort by last active
    conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    res.json(conversations);
});

// Get Total Unread Count
app.get('/api/dm/unread/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const count = await DirectMessage.countDocuments({ 
            receiverId: userId, 
            isRead: false 
        });
        res.json({ count });
    } catch (error) {
        res.json({ count: 0 });
    }
});

// Get message history between two users
app.get('/api/dm/history/:userId/:otherUserId', async (req, res) => {
    const { userId, otherUserId } = req.params;
    
    // Update isRead to true for messages received by userId from otherUserId
    await DirectMessage.updateMany(
        { senderId: otherUserId, receiverId: userId, isRead: false },
        { isRead: true }
    );

    const messages = await DirectMessage.find({
        $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
        ]
    }).sort({ timestamp: 1 });
    res.json(messages);
});

// Send Message
app.post('/api/dm/send', async (req, res) => {
    const { senderId, receiverId, content, type, replyToId } = req.body;
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    const newMessage = await DirectMessage.create({
        id: Math.random().toString(36).substr(2, 9),
        senderId,
        receiverId,
        content,
        timestamp: Date.now(),
        isRead: false,
        type: type || 'text',
        replyToId: replyToId || null,
        reactions: []
    } as any);
    res.json(newMessage);
});

// React to Message
app.post('/api/dm/react', async (req, res) => {
    const { messageId, userId, emoji } = req.body;
    
    // Fix: Cast to any to prevent Typescript from misinterpreting the Mongoose document structure
    const message: any = await DirectMessage.findOne({ id: messageId });
    if (!message) return res.status(404).json({ success: false });

    // Ensure reactions array exists
    if (!message.reactions) message.reactions = [];

    // Check if user already reacted
    const existingIndex = message.reactions.findIndex((r: any) => r.userId === userId);
    
    if (existingIndex > -1) {
        if (message.reactions[existingIndex].emoji === emoji) {
            // Remove reaction if same emoji clicked
            message.reactions.splice(existingIndex, 1);
        } else {
            // Update emoji
            message.reactions[existingIndex].emoji = emoji;
        }
    } else {
        // Add new reaction
        message.reactions.push({ userId, emoji });
    }

    // Mark specific path as modified because it's a nested array
    message.markModified('reactions');
    await message.save();
    
    res.json({ success: true, reactions: message.reactions });
});

// CHAT SESSIONS (AI)
app.get('/api/chat-sessions/:userId', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filterUserId = req.query.filterUserId as string || 'all';

    let matchStage: any = {};
    
    if (userId !== 'all' && userId !== 'admin') {
        matchStage.userId = userId;
    } else {
        if (filterUserId !== 'all') {
            matchStage.userId = filterUserId;
        }
    }

    const sessions = await ChatLog.aggregate([
        { $match: matchStage },
        { $sort: { timestamp: -1 } },
        {
            $group: {
                _id: { userId: "$userId", sessionId: "$customerSessionId" },
                lastActive: { $max: "$timestamp" },
                preview: { $first: "$query" },
                messageCount: { $sum: 1 },
                userId: { $first: "$userId" },
                sessionId: { $first: "$customerSessionId" }
            }
        },
        { $sort: { lastActive: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);

    const countResult = await ChatLog.aggregate([
        { $match: matchStage },
        { $group: { _id: { userId: "$userId", sessionId: "$customerSessionId" } } },
        { $count: "total" }
    ]);
    const total = countResult[0]?.total || 0;

    const mappedSessions = sessions.map(s => ({
        uniqueKey: `${s.userId}_${s.sessionId}`,
        ...s
    }));

    res.json({
        data: mappedSessions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
});

app.get('/api/chat-messages/:userId/:sessionId', async (req, res) => {
    const { userId, sessionId } = req.params;
    const query: any = { customerSessionId: sessionId };
    if (userId !== 'all' && userId !== 'admin') query.userId = userId;
    
    const messages = await ChatLog.find(query).sort({ timestamp: 1 });
    res.json(messages);
});

app.get('/api/chat-logs/:userId', async (req, res) => {
    const query = (req.params.userId !== 'all' && req.params.userId !== 'admin') ? { userId: req.params.userId } : {};
    const logs = await ChatLog.find(query).sort({ timestamp: -1 });
    res.json(logs);
});

// AUTH
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    const newUser = await User.create({
        id: Math.random().toString(36).substr(2, 9),
        email, password, role: 'user', createdAt: Date.now()
    } as any);
    res.json({ success: true, user: newUser });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });
});

app.post('/api/user/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });
    if (user.password !== oldPassword) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

app.post('/api/admin/reset-password', async (req, res) => {
    const { targetUserId, newPassword } = req.body;
    await User.findOneAndUpdate({ id: targetUserId }, { password: newPassword });
    res.json({ success: true, message: 'Reset mật khẩu thành công' });
});

app.delete('/api/admin/users/:id', async (req, res) => {
    const userId = req.params.id;
    await User.findOneAndDelete({ id: userId });
    await Document.deleteMany({ userId });
    await ChatLog.deleteMany({ userId });
    await Lead.deleteMany({ userId });
    res.json({ success: true, message: 'Xóa user thành công' });
});

// DOCS & SETTINGS
app.get('/api/documents/:userId', async (req, res) => {
    const docs = await Document.find({ userId: req.params.userId });
    res.json(docs);
});

app.get('/api/settings/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId });
    if(user) res.json(user.botSettings);
    else res.status(404).json({success: false});
});

app.post('/api/settings/:userId', async (req, res) => {
    await User.findOneAndUpdate(
        { id: req.params.userId }, 
        { $set: { botSettings: req.body } },
        { new: true, upsert: true }
    );
    res.json({ success: true });
});

app.post('/api/documents/text', async (req, res) => {
    const { name, content, userId } = req.body;
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    const newDoc = await Document.create({
        id: Math.random().toString(36).substr(2, 9),
        userId, name, content, type: 'text', status: 'indexed', createdAt: Date.now()
    } as any);
    res.json(newDoc);
});

app.post('/api/documents/upload', upload.single('file') as any, async (req: any, res: any) => {
    if (!req.file || !req.body.userId) return res.status(400).send('Missing file/userId');
    const content = req.file.buffer.toString('utf-8');
    // Fix: Cast object to any to avoid strict Mongoose type checking errors
    const newDoc = await Document.create({
        id: Math.random().toString(36).substr(2, 9),
        userId: req.body.userId,
        name: req.file.originalname,
        content: content,
        type: 'file',
        status: 'indexed',
        createdAt: Date.now()
    } as any);
    res.json(newDoc);
});

app.delete('/api/documents/:id', async (req, res) => {
    await Document.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
});

// CHAT AI
app.post('/api/chat', async (req, res) => {
    const { message, userId, botName, sessionId } = req.body;
    if (!process.env.API_KEY) return res.status(500).json({ error: "Missing API KEY" });
    
    const docs = await Document.find({ userId });
    const context = docs.map(d => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
    const systemInstruction = `Bạn là trợ lý AI tên "${botName || 'BibiBot'}". Hãy sử dụng kiến thức sau để hỗ trợ khách hàng: ${context}`;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: message, 
            config: { systemInstruction } 
        });
        const reply = response.text || "Tôi không thể trả lời.";
        
        // Fix: Cast object to any to avoid strict Mongoose type checking errors
        await ChatLog.create({
            id: Math.random().toString(36).substr(2, 9),
            userId,
            customerSessionId: sessionId || 'anon',
            query: message,
            answer: reply,
            timestamp: Date.now(),
            tokens: message.length,
            isSolved: !reply.includes("không có thông tin")
        } as any);
        
        res.json({ text: reply });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI Error" });
    }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
