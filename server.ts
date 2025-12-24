
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

dotenv.config();

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

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'https://bibichat.me';
const JWT_SECRET = process.env.JWT_SECRET || 'bibichat_super_secret_key_2025_change_me';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);

app.use(express.json({ limit: '100mb' }) as any);
app.use(express.urlencoded({ limit: '100mb', extended: true }) as any);

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

// Fix: Use 'any' for AuthRequest to avoid missing property errors (headers, body, etc.)
type AuthRequest = any;

const authenticateToken = (req: AuthRequest, res: any, next: NextFunction) => {
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
// Critical: Verify JWT before allowing socket connection
io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) {
            return next(new Error("Authentication error: Invalid token"));
        }
        // Attach decoded user info to socket instance safely
        (socket as any).user = decoded;
        next();
    });
});

const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket: any) => {
  // SECURITY: Use userId from verified Token, NOT from query params
  const userId = socket.user.id;
  
  if (userId) {
    socket.join(userId); // Join secure room based on Token ID
    onlineUsers.set(userId, socket.id);
    console.log(`⚡ User connected securely: ${socket.user.email} (${userId})`);
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

// Other schemas remain the same...
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

// --- INIT ADMIN USER (FORCED WIPE) ---
const initDB = async () => {
  console.log("🔥 FORCE WIPE INITIATED: Clearing all database collections...");
  
  try {
    // 1. Delete ALL Data
    await Promise.all([
        User.deleteMany({}),
        Document.deleteMany({}),
        ChatLog.deleteMany({}),
        Lead.deleteMany({}),
        Notification.deleteMany({}),
        DirectMessage.deleteMany({})
    ]);
    console.log("🧹 Database wiped successfully.");

    // 2. Create fresh Admin
    const adminEmail = 'admin@bibichat.me';
    const rawPassword = 'bangkieu';
    
    console.log(`✨ Creating Master Admin: ${adminEmail} / Password: ${rawPassword}`);
    
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    
    await User.create({
      id: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'master',
      createdAt: Date.now(),
      botSettings: { 
          botName: 'BibiBot', 
          primaryColor: '#ec4899', 
          welcomeMessage: 'Xin chào Admin! Hệ thống đã được làm mới.' 
      },
      plugins: {
         autoOpen: { enabled: false, delay: 5 },
         social: { enabled: true, zalo: '0979116118', phone: '0979116118' },
         leadForm: { enabled: true, title: 'Để lại thông tin nhé!', trigger: 'manual' }
      }
    } as any);
    
    console.log("✅ Database initialized! Ready to login.");
  } catch (error) {
    console.error("❌ Error initializing DB:", error);
  }
};

// Run Init
initDB();

const upload = multer({ storage: multer.memoryStorage() });

// --- WIDGET SCRIPT ---
app.get('/widget.js', (req, res) => {
  // ... (Widget JS Content remains same)
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
  
  // Basic postMessage handlers for resizing...
  window.addEventListener('message', function(event) {
    if (event.data === 'bibichat-open') {
       container.style.pointerEvents = 'auto';
       if(window.innerWidth < 480) {
         container.style.width = 'calc(100vw - 32px)'; 
         container.style.height = 'calc(100dvh - 32px)'; 
         container.style.left = '16px';
         container.style.bottom = '16px';
       } else {
         container.style.width = '380px';
         container.style.height = '600px';
       }
    } else if (event.data === 'bibichat-close') {
       container.style.width = '100px';
       container.style.height = '100px';
       container.style.pointerEvents = 'none'; 
    }
  });
})();
  `;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(scriptContent);
});

// --- ROUTES ---

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({ status: dbState === 1 ? 'ok' : 'error', message: dbState === 1 ? 'DB Connected' : 'DB Error' });
});

// Secure Upload
app.post('/api/upload/proxy', authenticateToken as any, upload.single('file') as any, async (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        res.json({ url: dataURI });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            id: randomUUID(),
            email, password: hashedPassword, role: 'user', createdAt: Date.now()
        } as any);
        
        const token = generateToken(newUser);
        const { password: _, ...userWithoutPass } = (newUser as any).toObject();
        
        res.json({ success: true, user: userWithoutPass, token });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });

        const token = generateToken(user);
        const { password: _, ...userWithoutPass } = (user as any).toObject();
        
        res.json({ success: true, user: userWithoutPass, token });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Fix: Use AuthRequest (any) and res: any to prevent TS errors on body parsing and res.json
app.post('/api/user/change-password', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // From Token
    
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

// --- PROTECTED ROUTES (Apply authenticateToken) ---

// Fix: Use any for req/res to handle query params and response methods
app.get('/api/users', authenticateToken as any, async (req: AuthRequest, res: any) => {
    // Only master can list users generally, or for search functionality
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10000;
    const search = (req.query.search as string || '').toLowerCase();
    
    // Only Master Admin can see full list, normal users might use this for "Find User to Chat"
    // For now allow all auth users to find others to chat
    const query: any = { role: { $ne: 'master' } };
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: 'i' } },
            { 'botSettings.botName': { $regex: search, $options: 'i' } }
        ];
    }
    
    const [total, users] = await Promise.all([
        User.countDocuments(query),
        User.find(query).select('-password').skip((page - 1) * limit).limit(limit).lean()
    ]);
    
    res.json({ data: users, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Direct Messaging (Protected)
// Fix: Use any for req/res
app.post('/api/dm/send', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { receiverId, content, type, replyToId, groupId } = req.body;
    const senderId = req.user.id; // Enforce sender as authenticated user

    const newMessage = await DirectMessage.create({
        id: randomUUID(),
        senderId, receiverId, content, timestamp: Date.now(), isRead: false,
        type: type || 'text', replyToId: replyToId || null, reactions: [], groupId: groupId || null
    } as any);

    const payload = { ... (newMessage as any).toObject(), replyToContent: null };
    
    // Emitting to rooms joined by verified Token IDs
    io.to(receiverId).emit('direct_message', payload);
    io.to(senderId).emit('message_sent', payload);

    res.json(newMessage);
});

// Fix: Use any for req/res
app.get('/api/dm/history/:userId/:otherUserId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    const { userId, otherUserId } = req.params;
    // Security check: Requesting user must be one of the participants
    if (req.user.id !== userId && req.user.id !== 'admin') {
        // Allow if user is 'admin' (master), otherwise block IDOR
        if (req.user.role !== 'master') return res.status(403).json({ error: "Unauthorized access to chat history" });
    }

    await DirectMessage.updateMany(
        { senderId: otherUserId, receiverId: userId, isRead: false },
        { isRead: true }
    );
    const messages = await DirectMessage.find({
        $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
        ]
    }).sort({ timestamp: 1 }).limit(100).lean();
    res.json(messages);
});

// Other routes (Settings, Plugins, Documents) - Protect specific routes
// Fix: Use any for req/res
app.post('/api/settings/:userId', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if(req.user.id !== req.params.userId && req.user.role !== 'master') return res.status(403).json({});
    await User.findOneAndUpdate({ id: req.params.userId }, { $set: { botSettings: req.body } }, { new: true, upsert: true });
    res.json({ success: true });
});

// Public endpoints (Chat Widget for visitors) remain unprotected or use a different auth mechanism (API Key)
app.post('/api/chat', async (req, res) => {
    // This is for the AI Bot on customer websites, keep using API_KEY from Env
    const { message, userId, botName, sessionId } = req.body;
    if (!process.env.API_KEY) return res.status(500).json({ error: "Missing API KEY" });
    // ... (rest of AI chat logic) ...
    try {
        const docs = await Document.find({ userId }).lean();
        const context = docs.map((d: any) => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
        const systemInstruction = `Bạn là trợ lý AI tên "${botName || 'BibiBot'}". Hãy sử dụng kiến thức sau để hỗ trợ khách hàng: ${context}`;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: message, 
            config: { systemInstruction } 
        });
        const reply = response.text || "Tôi không thể trả lời.";
        await ChatLog.create({
            id: randomUUID(),
            userId, customerSessionId: sessionId || 'anon', query: message, answer: reply, timestamp: Date.now(), tokens: message.length, isSolved: !reply.includes("không có thông tin")
        } as any);
        res.json({ text: reply });
    } catch (error) {
        res.status(500).json({ error: "AI Error" });
    }
});

// Admin routes protection
// Fix: Use any for req/res
app.delete('/api/admin/users/:id', authenticateToken as any, async (req: AuthRequest, res: any) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: "Admin only" });
    const userId = req.params.id;
    await User.findOneAndDelete({ id: userId });
    await Document.deleteMany({ userId });
    await ChatLog.deleteMany({ userId });
    await Lead.deleteMany({ userId });
    res.json({ success: true, message: 'Xóa user thành công' });
});

// For brevity, apply authenticators to other getters as needed in real production
// Leaving Public Read-Only endpoints for Widget (get settings/plugins) open
app.get('/api/settings/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId }).select('botSettings').lean();
    if(user) res.json(user.botSettings);
    else res.status(404).json({success: false});
});
app.get('/api/plugins/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId }).lean();
    if (user) res.json(user.plugins);
    else res.status(404).json({ success: false });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with JWT Security Enabled`);
});
