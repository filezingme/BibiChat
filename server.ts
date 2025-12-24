
import express, { RequestHandler } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Buffer } from 'buffer';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const httpServer = createServer(app); // Wrap express in HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for SaaS flexibility (Should strictly be CLIENT_URL in prod but * is safer for setup)
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8 // Tăng giới hạn buffer lên 100MB để handle ảnh Base64 qua Socket
} as any);

const PORT = process.env.PORT || 3001;

// CẤU HÌNH QUAN TRỌNG: URL của Frontend (Vercel/Custom Domain)
// Nếu không có biến môi trường, fallback về localhost để dev hoặc domain production
const CLIENT_URL = process.env.CLIENT_URL || 'https://bibichat.me';

// Middleware
app.use(cors({
  origin: '*', // Cho phép mọi domain gọi API (Cần thiết để Widget hoạt động trên web khách hàng)
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);

// INCREASE LIMIT TO 100MB TO BE SAFE WITH BASE64 IMAGES
app.use(express.json({ limit: '100mb' }) as any);
app.use(express.urlencoded({ limit: '100mb', extended: true }) as any);

// --- MONGODB OPTIMIZATION ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bibichat_local";

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 100, // High concurrency connection pool
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
} as any)
  .then(() => console.log('✅ Đã kết nối cơ sở dữ liệu thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// --- REAL-TIME SOCKET LOGIC ---
const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  
  if (userId) {
    socket.join(userId); // Join room named by userId for private messaging
    onlineUsers.set(userId, socket.id);
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

const documentSchema = new mongoose.Schema({
  id: { type: String, index: true },
  userId: { type: String, index: true },
  name: String,
  content: String,
  type: String,
  status: String,
  createdAt: Number
});

const chatLogSchema = new mongoose.Schema({
  id: String,
  userId: { type: String, index: true },
  customerSessionId: { type: String, index: true },
  query: String,
  answer: String,
  timestamp: { type: Number, index: true },
  tokens: Number,
  isSolved: Boolean
});

const leadSchema = new mongoose.Schema({
  id: String,
  userId: { type: String, index: true },
  name: String,
  phone: String,
  email: String,
  source: String,
  status: String,
  createdAt: { type: Number, index: true },
  isTest: Boolean
});

const notificationSchema = new mongoose.Schema({
  id: String,
  userId: { type: String, index: true },
  title: String,
  desc: String,
  time: { type: Number, index: true },
  scheduledAt: Number,
  readBy: [String],
  icon: String,
  color: String,
  bg: String
});

const directMessageSchema = new mongoose.Schema({
  id: { type: String, index: true },
  senderId: { type: String, index: true },
  receiverId: { type: String, index: true },
  content: String,
  timestamp: { type: Number, index: true },
  isRead: { type: Boolean, default: false, index: true },
  type: { type: String, default: 'text' }, 
  replyToId: String,
  reactions: [{ userId: String, emoji: String }],
  groupId: String 
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
  }
};
initDB();

const upload = multer({ storage: multer.memoryStorage() });

// --- WIDGET SCRIPT ENDPOINT (QUAN TRỌNG) ---
// Endpoint này trả về mã JS để tạo iframe trỏ về CLIENT_URL (Vercel/Custom Domain)
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
  
  // INITIAL POSITION - Default to Bottom Right to avoid jump
  container.style.bottom = '20px';
  container.style.right = '20px'; 
  container.style.left = 'auto';
  container.style.top = 'auto';

  // Increased width/height to 100px to accommodate shadow/hover without overflow
  container.style.width = '100px';
  container.style.height = '100px';
  container.style.border = 'none';
  container.style.transition = 'all 0.3s ease';
  container.style.background = 'transparent'; // Ensure container is transparent
  container.style.pointerEvents = 'none'; // Allow clicking through empty space initially
  
  // IFRAME SOURCE TRỎ VỀ CLIENT_URL
  // Xóa trailing slash nếu có để tránh lỗi 2 dấu //
  var clientUrl = '${CLIENT_URL}'.replace(/\\/$/, '');
  var iframe = document.createElement('iframe');
  iframe.src = clientUrl + '?mode=embed&userId=' + widgetId;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '0';
  iframe.style.background = 'transparent'; // Ensure iframe background is transparent
  iframe.allow = "microphone";
  iframe.setAttribute('allowTransparency', 'true'); // For older browsers
  iframe.setAttribute('scrolling', 'no'); // CRITICAL: Stop scrollbars
  iframe.style.pointerEvents = 'auto'; // Re-enable pointer events for the iframe itself
  iframe.style.overflow = 'hidden'; // Ensure no scrollbars
  
  container.appendChild(iframe);
  document.body.appendChild(container);

  var currentPos = 'bottom-right';

  function applyPosition(pos) {
      currentPos = pos;
      // Reset all
      container.style.top = 'auto';
      container.style.bottom = 'auto';
      container.style.left = 'auto';
      container.style.right = 'auto';
      container.style.transform = 'none'; // Reset transform

      if (pos === 'top-left') {
          container.style.top = '20px';
          container.style.left = '20px';
      } else if (pos === 'top-right') {
          container.style.top = '20px';
          container.style.right = '20px';
      } else if (pos === 'bottom-left') {
          container.style.bottom = '20px';
          container.style.left = '20px';
      } else if (pos === 'top-center') {
          container.style.top = '20px';
          container.style.left = '50%';
          container.style.transform = 'translateX(-50%)';
      } else if (pos === 'bottom-center') {
          container.style.bottom = '20px';
          container.style.left = '50%';
          container.style.transform = 'translateX(-50%)';
      } else if (pos === 'left-center') {
          container.style.left = '20px';
          container.style.top = '50%';
          container.style.transform = 'translateY(-50%)';
      } else if (pos === 'right-center') {
          container.style.right = '20px';
          container.style.top = '50%';
          container.style.transform = 'translateY(-50%)';
      } else {
          // Default bottom-right
          container.style.bottom = '20px';
          container.style.right = '20px';
      }
  }

  window.addEventListener('message', function(event) {
    if (event.data === 'bibichat-open') {
       container.style.pointerEvents = 'auto';
       
       if(window.innerWidth < 480) {
         // Mobile Logic: Float with margins instead of full screen
         container.style.width = 'calc(100vw - 32px)'; 
         container.style.height = 'calc(100dvh - 32px)'; 
         if (!CSS.supports('height: 100dvh')) container.style.height = 'calc(100vh - 32px)';
         
         // On Mobile Open, force simple layout to avoid complexities with transforms
         container.style.transform = 'none'; 
         container.style.left = '16px';
         container.style.right = 'auto'; // Reset
         
         // Respect Top/Bottom preference but force X alignment
         if (currentPos.includes('top')) {
             container.style.top = '16px';
             container.style.bottom = 'auto';
         } else {
             // Default bottom alignment for most mobile modals
             container.style.bottom = '16px';
             container.style.top = 'auto';
         }

         container.style.borderRadius = '24px'; 
         container.style.margin = '0';
         container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.35)'; 
       } else {
         // Desktop/Tablet Popover Logic
         container.style.width = '380px';
         container.style.height = '600px';
         container.style.borderRadius = '24px';
         container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
         // Position is already handled by applyPosition, width/height expands from that anchor
         // If transforms are used (centers), expanding width/height works fine from center point
       }
    } else if (event.data === 'bibichat-close') {
       // Reset to button size
       container.style.width = '100px';
       container.style.height = '100px';
       container.style.borderRadius = '0';
       container.style.boxShadow = 'none';
       
       // Re-apply position to ensure it snaps back correctly if mobile messed it up
       applyPosition(currentPos);
       
       container.style.pointerEvents = 'none'; 
    } else if (event.data && event.data.type === 'bibichat-position') {
       // Handle 8 positions
       if (container.style.width !== '100vw' && container.style.width !== 'calc(100vw - 32px)') {
           applyPosition(event.data.position);
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
  res.json({ 
    status: dbState === 1 ? 'ok' : 'error', 
    dbState: dbState,
    message: dbState === 1 ? 'Đã kết nối cơ sở dữ liệu' : 'Mất kết nối cơ sở dữ liệu'
  });
});

// --- PROXY UPLOAD (CONVERT TO BASE64) ---
// Chuyển sang Base64 storage để đảm bảo ảnh luôn tồn tại và không phụ thuộc dịch vụ bên ngoài
app.post('/api/upload/proxy', upload.single('file') as any, async (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        console.log(`[Upload] Processing image ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const mime = req.file.mimetype;
        const dataURI = `data:${mime};base64,${b64}`;
        
        console.log(`[Upload] Converted to Base64 successfully. Length: ${dataURI.length}`);
        
        // Return as if it were a URL
        res.json({ url: dataURI });
    } catch (error: any) {
        console.error("Upload/Conversion error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ... (Rest of the file remains unchanged) ...
// --- API ROUTES ---

app.get('/api/plugins/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId }).lean();
    if (user) res.json(user.plugins);
    else res.status(404).json({ success: false });
});

app.post('/api/plugins/:userId', async (req, res) => {
    await User.findOneAndUpdate(
        { id: req.params.userId }, 
        { $set: { plugins: req.body } }, 
        { new: true, upsert: true }
    );
    res.json({ success: true });
});

app.get('/api/leads/:userId', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string || '').toLowerCase();
    
    const query: any = {};
    if (userId !== 'all') {
        query.userId = userId;
    }
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    
    const [total, leads] = await Promise.all([
        Lead.countDocuments(query),
        Lead.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);

    res.json({
        data: leads,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
});

app.post('/api/leads', async (req, res) => {
    const { userId, name, phone, email, isTest } = req.body;
    const newLead = await Lead.create({
        id: randomUUID(),
        userId, name, phone, email, source: 'chat_form', status: 'new', createdAt: Date.now(), isTest: !!isTest
    } as any);
    
    // Notify bot owner in real-time
    io.to(userId).emit('new_lead', newLead);
    
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

app.get('/api/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    const now = Date.now();
    let filter: any = {};

    if (userId === 'admin' || userId === 'master') {
        filter = { $or: [{ userId: 'all' }, { userId: 'admin' }] };
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

    const notifs = await Notification.find(filter).sort({ scheduledAt: -1, time: -1 }).limit(50).lean();
    const mapped = notifs.map((n: any) => ({
        ...n,
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
    await Notification.updateMany(filter, { $addToSet: { readBy: userId } });
    res.json({ success: true });
});

app.post('/api/notifications/create', async (req, res) => {
    const scheduledTime = Number(req.body.scheduledAt) || Date.now();
    const newNotif = await Notification.create({
        id: randomUUID(),
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

    // Broadcast Real-time
    if (req.body.userId === 'all') {
        io.emit('notification', newNotif);
    } else {
        io.to(req.body.userId).emit('notification', newNotif);
    }

    res.json(newNotif);
});

// SECURITY FIX: Exclude password from user list
app.get('/api/users', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10000;
    const search = (req.query.search as string || '').toLowerCase();
    
    const query: any = { role: { $ne: 'master' } };
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: 'i' } },
            { 'botSettings.botName': { $regex: search, $options: 'i' } }
        ];
    }
    
    const [total, users] = await Promise.all([
        User.countDocuments(query),
        // CRITICAL: Exclude password field
        User.find(query).select('-password').skip((page - 1) * limit).limit(limit).lean()
    ]);
    
    res.json({ data: users, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// --- MESSAGING ---
app.post('/api/dm/find', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('id email role').lean();
    if (user) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
});

app.get('/api/dm/conversations/:userId', async (req, res) => {
    const { userId } = req.params;
    
    const rawConversations = await DirectMessage.aggregate([
        { 
            $match: { 
                $or: [{ senderId: userId }, { receiverId: userId }] 
            } 
        },
        { 
            $sort: { timestamp: -1 } 
        },
        {
            $group: {
                _id: {
                    $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"]
                },
                lastMessage: { $first: "$content" },
                lastMessageTime: { $first: "$timestamp" },
                type: { $first: "$type" },
                unreadCount: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ["$receiverId", userId] }, { $eq: ["$isRead", false] }] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const contactIds = rawConversations.map(c => c._id);
    const contacts = await User.find({ id: { $in: contactIds } }).select('id email role').lean();

    const conversations = rawConversations.map(conv => {
        const contact = contacts.find(c => c.id === conv._id);
        if (!contact) return null;

        let previewText = conv.lastMessage || '';
        if (conv.type === 'sticker') previewText = '[Sticker]';
        else if (conv.type === 'image') previewText = '[Hình ảnh]';

        return {
            id: contact.id,
            email: contact.email,
            role: contact.role,
            lastMessage: previewText,
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCount
        };
    }).filter(c => c !== null);

    conversations.sort((a, b) => (b?.lastMessageTime || 0) - (a?.lastMessageTime || 0));
    res.json(conversations);
});

app.get('/api/dm/unread/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const count = await DirectMessage.countDocuments({ receiverId: userId, isRead: false });
        res.json({ count });
    } catch (error) {
        res.json({ count: 0 });
    }
});

app.get('/api/dm/history/:userId/:otherUserId', async (req, res) => {
    const { userId, otherUserId } = req.params;
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

app.post('/api/dm/send', async (req, res) => {
    const { senderId, receiverId, content, type, replyToId, groupId } = req.body;
    const newMessage = await DirectMessage.create({
        id: randomUUID(),
        senderId, receiverId, content, timestamp: Date.now(), isRead: false,
        type: type || 'text', replyToId: replyToId || null, reactions: [], groupId: groupId || null
    } as any);

    const payload = {
        ...(newMessage as any).toObject(),
        replyToContent: null
    };
    
    io.to(receiverId).emit('direct_message', payload);
    io.to(senderId).emit('message_sent', payload);

    res.json(newMessage);
});

app.post('/api/dm/react', async (req, res) => {
    const { messageId, userId, emoji } = req.body;
    const message: any = await DirectMessage.findOne({ id: messageId });
    if (!message) return res.status(404).json({ success: false });

    if (!message.reactions) message.reactions = [];
    const existingIndex = message.reactions.findIndex((r: any) => r.userId === userId);
    
    if (existingIndex > -1) {
        if (message.reactions[existingIndex].emoji === emoji) message.reactions.splice(existingIndex, 1);
        else message.reactions[existingIndex].emoji = emoji;
    } else {
        message.reactions.push({ userId, emoji });
    }

    message.markModified('reactions');
    await message.save();
    
    io.to(message.senderId).to(message.receiverId).emit('message_reaction', { 
        messageId, reactions: message.reactions 
    });
    
    res.json({ success: true, reactions: message.reactions });
});

app.get('/api/chat-sessions/:userId', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filterUserId = req.query.filterUserId as string || 'all';

    let matchStage: any = {};
    if (userId !== 'all' && userId !== 'admin') matchStage.userId = userId;
    else if (filterUserId !== 'all') matchStage.userId = filterUserId;

    const [sessions, countResult] = await Promise.all([
        ChatLog.aggregate([
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
        ]),
        ChatLog.aggregate([
            { $match: matchStage },
            { $group: { _id: { userId: "$userId", sessionId: "$customerSessionId" } } },
            { $count: "total" }
        ])
    ]);

    const total = countResult[0]?.total || 0;
    const mappedSessions = sessions.map(s => ({ uniqueKey: `${s.userId}_${s.sessionId}`, ...s }));

    res.json({
        data: mappedSessions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
});

app.get('/api/chat-messages/:userId/:sessionId', async (req, res) => {
    const { userId, sessionId } = req.params;
    const query: any = { customerSessionId: sessionId };
    if (userId !== 'all' && userId !== 'admin') query.userId = userId;
    const messages = await ChatLog.find(query).sort({ timestamp: 1 }).limit(100).lean();
    res.json(messages);
});

app.get('/api/chat-logs/:userId', async (req, res) => {
    const query = (req.params.userId !== 'all' && req.params.userId !== 'admin') ? { userId: req.params.userId } : {};
    const logs = await ChatLog.find(query).sort({ timestamp: -1 }).limit(2000).lean();
    res.json(logs);
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    
    const newUser = await User.create({
        id: randomUUID(),
        email, password, role: 'user', createdAt: Date.now()
    } as any);
    
    // SECURITY FIX: Remove password from response
    const { password: _, ...userWithoutPass } = (newUser as any).toObject();
    res.json({ success: true, user: userWithoutPass });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password }).lean();
    if (user) {
        // SECURITY FIX: Remove password from response
        const { password: _, ...userWithoutPass } = user;
        res.json({ success: true, user: userWithoutPass });
    }
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

app.get('/api/documents/:userId', async (req, res) => {
    const docs = await Document.find({ userId: req.params.userId }).lean();
    res.json(docs);
});

app.get('/api/settings/:userId', async (req, res) => {
    const user = await User.findOne({ id: req.params.userId }).select('botSettings').lean();
    if(user) res.json(user.botSettings);
    else res.status(404).json({success: false});
});

app.post('/api/settings/:userId', async (req, res) => {
    await User.findOneAndUpdate({ id: req.params.userId }, { $set: { botSettings: req.body } }, { new: true, upsert: true });
    res.json({ success: true });
});

app.post('/api/documents/text', async (req, res) => {
    const { name, content, userId } = req.body;
    const newDoc = await Document.create({
        id: randomUUID(), userId, name, content, type: 'text', status: 'indexed', createdAt: Date.now()
    } as any);
    res.json(newDoc);
});

app.post('/api/documents/upload', upload.single('file') as any, async (req: any, res: any) => {
    if (!req.file || !req.body.userId) return res.status(400).send('Missing file/userId');
    const content = req.file.buffer.toString('utf-8');
    const newDoc = await Document.create({
        id: randomUUID(), userId: req.body.userId, name: req.file.originalname, content, type: 'file', status: 'indexed', createdAt: Date.now()
    } as any);
    res.json(newDoc);
});

app.delete('/api/documents/:id', async (req, res) => {
    await Document.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
    const { message, userId, botName, sessionId } = req.body;
    if (!process.env.API_KEY) return res.status(500).json({ error: "Missing API KEY" });
    
    const docs = await Document.find({ userId }).lean();
    const context = docs.map((d: any) => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
    const systemInstruction = `Bạn là trợ lý AI tên "${botName || 'BibiBot'}". Hãy sử dụng kiến thức sau để hỗ trợ khách hàng: ${context}`;
    
    try {
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
        console.error(error);
        res.status(500).json({ error: "AI Error" });
    }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server (Http+Socket) running at http://localhost:${PORT}`);
  console.log(`🔗 Backend URL: ${process.env.SERVER_URL || 'http://localhost:' + PORT}`);
  console.log(`🔗 Client URL (CORS): ${CLIENT_URL}`);
  console.log(`📡 Widget Endpoint: ${process.env.SERVER_URL || 'http://localhost:' + PORT}/widget.js`);
});
