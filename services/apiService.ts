import { GoogleGenAI } from "@google/genai";
import { User, Document, WidgetSettings, ChatLog, UserRole, Notification, Lead, PluginConfig, DirectMessage, ConversationUser, Reaction } from "../types";

// URL Backend
const API_URL = process.env.SERVER_URL || '';
const TOKEN_KEY = 'bibichat_jwt_token';
const DB_KEY = 'bibichat_db_v1';

let isOfflineMode = false;

const MASTER_USER: User = {
  id: 'admin',
  email: 'admin@bibichat.me', 
  password: 'bangkieu', // We'll just do a simple check for offline
  role: 'master',
  createdAt: Date.now(),
  botSettings: { 
    botName: 'BibiBot', 
    primaryColor: '#ec4899', 
    welcomeMessage: 'Xin chào! Hệ thống quản trị Master (Chế độ Offline).', 
    position: 'bottom-right', 
    avatarUrl: '' 
  },
  plugins: {
    autoOpen: { enabled: false, delay: 5 },
    social: { enabled: true, zalo: '0979116118', phone: '0979116118' },
    leadForm: { enabled: true, title: 'Để lại thông tin nhé!', trigger: 'manual' }
  }
};

const getLocalDB = () => {
  const data = localStorage.getItem(DB_KEY);
  let db;
  if (!data) {
    db = { users: [MASTER_USER], documents: [], chatLogs: [], notifications: [], leads: [], directMessages: [] };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } else {
    db = JSON.parse(data);
    if (!db.notifications) db.notifications = [];
    if (!db.leads) db.leads = [];
    if (!db.chatLogs) db.chatLogs = [];
    if (!db.directMessages) db.directMessages = [];
  }
  return db;
};

const saveLocalDB = (db: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// --- AUTH HELPER ---
const getAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export const apiService = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  
  isOffline: () => isOfflineMode,

  // --- SYSTEM CHECK ---
  checkHealth: async (): Promise<{ online: boolean, message: string }> => {
    let retries = 3;
    while(retries > 0) {
        try {
          const res = await fetch(`${API_URL}/api/health?t=\${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            const online = data.status === 'ok';
            if (online) {
               isOfflineMode = false;
               return { online, message: data.message };
            }
          }
        } catch (e) {
          // ignore error to retry
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    isOfflineMode = true;
    return { online: false, message: 'Không thể kết nối máy chủ' };
  },

  // --- UPLOAD (Authenticated) ---
  uploadFile: async (file: File): Promise<{ url: string }> => {
      if (isOfflineMode) throw new Error('Offline');
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem(TOKEN_KEY);
      
      try {
        const res = await fetch(`${API_URL}/api/upload/proxy`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });
        
        if (!res.ok) throw new Error('Upload failed');
        return await res.json();
      } catch (e) {
        // Offline fallback: convert to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ url: reader.result as string });
          reader.onerror = () => reject(new Error('Failed to read file offline'));
          reader.readAsDataURL(file);
        });
      }
  },

  // --- DIRECT MESSAGING ---
  findUserByEmail: async (email: string): Promise<{ success: boolean, user?: {id: string, email: string, role: string}, message?: string }> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/dm/find`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ email })
          });
          if (!res.ok) throw new Error('Not found');
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          const user = db.users.find((u: any) => u.email === email);
          if (user) return { success: true, user: { id: user.id, email: user.email, role: user.role } };
          return { success: false, message: 'Không tìm thấy người dùng (Offline)' };
      }
  },

  getConversations: async (userId: string): Promise<ConversationUser[]> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/dm/conversations/${userId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          return Array.isArray(data) ? data : [];
      } catch (e) {
          const db = getLocalDB();
          const msgs = db.directMessages.filter((m: any) => m.senderId === userId || m.receiverId === userId);
          const convMap = new Map<string, any>();
          
          msgs.forEach((m: any) => {
            const otherId = m.senderId === userId ? m.receiverId : m.senderId;
            if (!convMap.has(otherId) || convMap.get(otherId).lastMessageTime < m.timestamp) {
              convMap.set(otherId, {
                lastMessage: m.type === 'image' ? '[Hình ảnh]' : (m.type === 'sticker' ? '[Sticker]' : m.content),
                lastMessageTime: m.timestamp,
                isRead: m.isRead,
                senderId: m.senderId
              });
            }
          });

          const results = Array.from(convMap.entries()).map(([otherId, conv]) => {
            const user = db.users.find((u: any) => u.id === otherId);
            if (!user) return null;
            const unreadCount = db.directMessages.filter((m: any) => m.senderId === otherId && m.receiverId === userId && !m.isRead).length;
            return {
              id: user.id,
              email: user.email,
              role: user.role,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
              unreadCount
            };
          }).filter(r => r !== null).sort((a: any, b: any) => b.lastMessageTime - a.lastMessageTime);
          return results as any;
      }
  },

  getDirectMessages: async (userId: string, otherUserId: string): Promise<DirectMessage[]> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/dm/history/${userId}/${otherUserId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          return Array.isArray(data) ? data : [];
      } catch (e) {
          const db = getLocalDB();
          // Mark as read
          db.directMessages.forEach((m: any) => {
            if (m.senderId === otherUserId && m.receiverId === userId) m.isRead = true;
          });
          saveLocalDB(db);
          
          return db.directMessages.filter((m: any) => 
            (m.senderId === userId && m.receiverId === otherUserId) ||
            (m.senderId === otherUserId && m.receiverId === userId)
          ).sort((a: any, b: any) => a.timestamp - b.timestamp);
      }
  },

  sendDirectMessage: async (senderId: string, receiverId: string, content: string, type: 'text' | 'sticker' | 'image' = 'text', replyToId?: string, groupId?: string): Promise<DirectMessage> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/dm/send`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ receiverId, content, type, replyToId, groupId })
          });
          if (!res.ok) throw new Error('Failed');
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          const newMessage = {
            id: Date.now().toString(),
            senderId, receiverId, content, type, replyToId, groupId,
            timestamp: Date.now(), isRead: false, reactions: []
          };
          db.directMessages.push(newMessage);
          saveLocalDB(db);
          return newMessage as any;
      }
  },

  reactToMessage: async (messageId: string, userId: string, emoji: string): Promise<{ success: boolean, reactions?: Reaction[] }> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/dm/react`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ messageId, userId, emoji })
          });
          if (!res.ok) throw new Error('Failed');
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          const msg = db.directMessages.find((m: any) => m.id === messageId);
          if (msg) {
            const existingIdx = msg.reactions.findIndex((r: any) => r.userId === userId);
            if (existingIdx > -1) {
                if (msg.reactions[existingIdx].emoji === emoji) msg.reactions.splice(existingIdx, 1);
                else msg.reactions[existingIdx].emoji = emoji;
            } else {
                msg.reactions.push({ userId, emoji });
            }
            saveLocalDB(db);
            return { success: true, reactions: msg.reactions };
          }
          return { success: false };
      }
  },

  getUnreadMessagesCount: async (userId: string): Promise<number> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/dm/unread/${userId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          return data.count || 0;
      } catch (e) {
          const db = getLocalDB();
          return db.directMessages.filter((m: any) => m.receiverId === userId && !m.isRead).length;
      }
  },

  // --- AUTH ---
  register: async (email: string, password: string): Promise<{success: boolean, message: string, user?: User, token?: string}> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         if (res.status === 503) throw new Error('Offline');
         return { success: false, message: errData.message || 'Server error' };
      }
      const serverRes = await res.json();
      
      if (serverRes.success && serverRes.token) {
          localStorage.setItem(TOKEN_KEY, serverRes.token);
      }
      return serverRes;
    } catch (e: any) {
      if (e.message !== 'Offline' && !e.message.includes('fetch')) {
          return { success: false, message: e.message || 'Lỗi kết nối' };
      }

      const db = getLocalDB();
      if (db.users.find((u: any) => u.email === email)) {
        return { success: false, message: 'Email đã tồn tại (Offline)' };
      }
      const newUser = {
        id: Date.now().toString(),
        email,
        password, // In offline mode, store plain text for simplicity
        role: 'user',
        createdAt: Date.now(),
        botSettings: { botName: 'Trợ lý AI', primaryColor: '#8b5cf6', welcomeMessage: 'Xin chào!', position: 'bottom-right', avatarUrl: '' },
        plugins: { autoOpen: { enabled: false, delay: 5 }, social: { enabled: false }, leadForm: { enabled: false } }
      };
      db.users.push(newUser);
      saveLocalDB(db);
      const fakeToken = 'offline_token_' + newUser.id;
      localStorage.setItem(TOKEN_KEY, fakeToken);
      return { success: true, user: newUser as any, token: fakeToken };
    }
  },

  login: async (email: string, password: string): Promise<{success: boolean, message: string, user?: User, token?: string}> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         if (res.status === 503) throw new Error('Offline');
         return { success: false, message: errData.message || 'Lỗi đăng nhập từ Server' };
      }
      
      const data = await res.json();
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data;
    } catch (e: any) {
      if (e.message !== 'Offline' && !e.message.includes('fetch')) {
          return { success: false, message: e.message || 'Lỗi kết nối' };
      }

      const db = getLocalDB();
      const user = db.users.find((u: any) => u.email === email && u.password === password);
      if (user) {
        const fakeToken = 'offline_token_' + user.id;
        localStorage.setItem(TOKEN_KEY, fakeToken);
        return { success: true, user, token: fakeToken };
      }
      return { success: false, message: 'Sai thông tin đăng nhập (Offline)' };
    }
  },

  changePassword: async (userId: string, oldPassword: string, newPassword: string): Promise<{success: boolean, message: string}> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/user/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      const user = db.users.find((u: any) => u.id === userId);
      if (user && user.password === oldPassword) {
        user.password = newPassword;
        saveLocalDB(db);
        return { success: true, message: 'Đổi mật khẩu thành công (Offline)' };
      }
      return { success: false, message: "Sai mật khẩu cũ (Offline)" };
    }
  },

  // --- ADMIN TOOLS ---
  getAllUsers: async (): Promise<User[]> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (e) {
      const db = getLocalDB();
      return db.users;
    }
  },

  getUsersPaginated: async (page: number, limit: number, search: string): Promise<{ data: User[], total: number, totalPages: number }> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error("Lỗi máy chủ");
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          let filtered = db.users.filter((u: any) => u.role !== 'master');
          if(search) {
             filtered = filtered.filter((u: any) => u.email.toLowerCase().includes(search.toLowerCase()));
          }
          const total = filtered.length;
          const start = (page - 1) * limit;
          return {
              data: filtered.slice(start, start + limit),
              total,
              totalPages: Math.ceil(total / limit)
          };
      }
  },

  resetUserPassword: async (targetUserId: string, newPassword: string): Promise<{success: boolean, message: string}> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetUserId, newPassword })
      });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
       const db = getLocalDB();
       const user = db.users.find((u: any) => u.id === targetUserId);
       if (user) {
         user.password = newPassword;
         saveLocalDB(db);
         return { success: true, message: 'Đã reset mật khẩu (Offline)' };
       }
       return { success: false, message: "Không tìm thấy người dùng" };
    }
  },

  deleteUser: async (targetUserId: string): Promise<{success: boolean, message: string}> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/admin/users/${targetUserId}`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      db.users = db.users.filter((u: any) => u.id !== targetUserId);
      saveLocalDB(db);
      return { success: true, message: "Đã xóa người dùng (Offline)" };
    }
  },

  // --- SETTINGS (Protected update, Public read) ---
  updateSettings: async (userId: string, settings: WidgetSettings) => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/settings/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed');
    } catch (e) {
        const db = getLocalDB();
        const user = db.users.find((u: any) => u.id === userId);
        if (user) {
          user.botSettings = settings;
          saveLocalDB(db);
        }
    }
  },
  
  // Public Read
  getPlugins: async (userId: string): Promise<PluginConfig> => {
    try {
        if (isOfflineMode) throw new Error('Offline');
        const res = await fetch(`${API_URL}/api/plugins/${userId}`);
        if (!res.ok) throw new Error("Err");
        return await res.json();
    } catch (e) {
        const db = getLocalDB();
        const user = db.users.find((u: any) => u.id === userId);
        if (user && user.plugins) return user.plugins;
        return { autoOpen: { enabled: false, delay: 5 }, social: { enabled: false, zalo: '', phone: '' }, leadForm: { enabled: false, title: '', trigger: 'manual' } };
    }
  },

  updatePlugins: async (userId: string, plugins: PluginConfig) => {
    try {
        if (isOfflineMode) throw new Error('Offline');
        const res = await fetch(`${API_URL}/api/plugins/${userId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(plugins)
        });
        if (!res.ok) throw new Error('Failed');
    } catch (e) {
       const db = getLocalDB();
       const user = db.users.find((u: any) => u.id === userId);
       if (user) {
         user.plugins = plugins;
         saveLocalDB(db);
       }
    }
  },

  getChatSessionsPaginated: async (userId: string | 'all', page: number, limit: number, filterUserId: string = 'all'): Promise<{ data: any[], pagination: any }> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/chat-sessions/${userId}?page=${page}&limit=${limit}&filterUserId=${filterUserId}`, { headers: getAuthHeaders() });
          if(!res.ok) throw new Error("Err");
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          let logs = db.chatLogs;
          if (userId !== 'all') logs = logs.filter((l: any) => l.userId === userId);
          if (filterUserId && filterUserId !== 'all') logs = logs.filter((l: any) => l.userId === filterUserId);
          
          const sessionsMap = new Map();
          logs.forEach((l: any) => {
            if (!sessionsMap.has(l.customerSessionId) || sessionsMap.get(l.customerSessionId).lastActive < l.timestamp) {
              sessionsMap.set(l.customerSessionId, {
                sessionId: l.customerSessionId,
                uniqueKey: l.customerSessionId,
                userId: l.userId,
                lastActive: l.timestamp,
                preview: l.query,
                messageCount: logs.filter((x: any) => x.customerSessionId === l.customerSessionId).length
              });
            }
          });
          
          const sessions = Array.from(sessionsMap.values()).sort((a: any, b: any) => b.lastActive - a.lastActive);
          const total = sessions.length;
          const start = (page - 1) * limit;
          return { data: sessions.slice(start, start + limit), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
      }
  },

  getChatMessages: async (userId: string | 'all', sessionId: string): Promise<ChatLog[]> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/chat-messages/${userId}/${sessionId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          return Array.isArray(data) ? data : [];
      } catch (e) {
          const db = getLocalDB();
          return db.chatLogs.filter((l: any) => l.customerSessionId === sessionId).sort((a: any, b: any) => a.timestamp - b.timestamp);
      }
  },
  
  chat: async (userId: string, message: string, botName: string, sessionId: string): Promise<string> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, message, botName, sessionId })
          });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          return data.text;
      } catch (e) {
          const db = getLocalDB();
          const reply = "Xin lỗi, hệ thống đang ngoại tuyến. Không thể kết nối với AI.";
          db.chatLogs.push({
            id: Date.now().toString(),
            userId, customerSessionId: sessionId, query: message, answer: reply, timestamp: Date.now(), tokens: message.length, isSolved: false
          });
          saveLocalDB(db);
          return reply;
      }
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/notifications/${userId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          return Array.isArray(data) ? data : [];
      } catch (e) {
          const db = getLocalDB();
          return db.notifications.filter((n: any) => n.userId === 'system' || n.userId === userId).map((n: any) => ({
            ...n, isRead: n.readBy?.includes(userId)
          })).sort((a: any, b: any) => b.time - a.time);
      }
  },
  
  markNotificationRead: async (notifId: string, userId: string) => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          await fetch(`${API_URL}/api/notifications/${notifId}/read`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ userId })
          });
      } catch (e) {
          const db = getLocalDB();
          const notif = db.notifications.find((n: any) => n.id === notifId);
          if (notif) {
            if (!notif.readBy) notif.readBy = [];
            if (!notif.readBy.includes(userId)) notif.readBy.push(userId);
            saveLocalDB(db);
          }
      }
  },

  markAllNotificationsRead: async (userId: string) => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          await fetch(`${API_URL}/api/notifications/read-all`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ userId })
          });
      } catch (e) {
          const db = getLocalDB();
          db.notifications.forEach((n: any) => {
            if (n.userId === 'system' || n.userId === userId) {
              if (!n.readBy) n.readBy = [];
              if (!n.readBy.includes(userId)) n.readBy.push(userId);
            }
          });
          saveLocalDB(db);
      }
  },

  createSystemNotification: async (notif: Partial<Notification>) => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/notifications/create`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(notif)
          });
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          db.notifications.push({
            id: Date.now().toString(),
            userId: notif.userId === 'all' ? 'system' : notif.userId,
            title: notif.title, desc: notif.desc, time: notif.scheduledAt || Date.now(), readBy: [], icon: notif.icon, color: notif.color, bg: notif.bg
          });
          saveLocalDB(db);
          return { success: true };
      }
  },
  
  getLeadsPaginated: async (userId: string, page: number, limit: number, search: string = ''): Promise<{ data: Lead[], pagination: any }> => {
    try {
        if (isOfflineMode) throw new Error('Offline');
        const res = await fetch(`${API_URL}/api/leads/${userId}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        return { data: Array.isArray(data.data) ? data.data : [], pagination: data.pagination || {} };
    } catch (e) {
        const db = getLocalDB();
        let filtered = db.leads.filter((l: any) => l.userId === userId);
        if (search) filtered = filtered.filter((l: any) => l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search));
        const total = filtered.length;
        const start = (page - 1) * limit;
        return { data: filtered.slice(start, start + limit).sort((a: any, b: any) => b.createdAt - a.createdAt), pagination: { total, totalPages: Math.ceil(total / limit) } };
    }
  },
  
  submitLead: async (userId: string, name: string, phone: string, email: string, isTest: boolean = false): Promise<Lead> => {
    try {
        if (isOfflineMode) throw new Error('Offline');
        const res = await fetch(`${API_URL}/api/leads`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, name, phone, email, isTest })
        });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    } catch (e) { 
        const db = getLocalDB();
        const newLead = { id: Date.now().toString(), userId, name, phone, email, source: 'widget', status: 'new', createdAt: Date.now(), isTest };
        db.leads.push(newLead);
        saveLocalDB(db);
        return newLead as any;
    }
  },

  updateLeadStatus: async (leadId: string, status: string) => {
    try {
        if (isOfflineMode) throw new Error('Offline');
        const res = await fetch(`${API_URL}/api/leads/${leadId}/status`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed');
    } catch (e) {
        const db = getLocalDB();
        const lead = db.leads.find((l: any) => l.id === leadId);
        if (lead) {
          lead.status = status;
          saveLocalDB(db);
        }
    }
  },

  deleteLead: async (leadId: string) => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/leads/${leadId}`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
    } catch (e) {
      const db = getLocalDB();
      db.leads = db.leads.filter((l: any) => l.id !== leadId);
      saveLocalDB(db);
    }
  },

  getDocuments: async (userId: string): Promise<Document[]> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/documents/${userId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      const db = getLocalDB();
      return db.documents.filter((d: any) => d.userId === userId).sort((a: any, b: any) => b.createdAt - a.createdAt);
    }
  },

  addDocument: async (userId: string, name: string, content: string, type: 'text' | 'file'): Promise<Document> => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/documents/text`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, content, userId })
      });
      if (!res.ok) throw new Error('Failed');
      return await res.json();
    } catch (e) { 
      const db = getLocalDB();
      const newDoc = { id: Date.now().toString(), userId, name, content, type, status: 'indexed', createdAt: Date.now() };
      db.documents.push(newDoc);
      saveLocalDB(db);
      return newDoc as any;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      if (isOfflineMode) throw new Error('Offline');
      const res = await fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
    } catch (e) {
      const db = getLocalDB();
      db.documents = db.documents.filter((d: any) => d.id !== id);
      saveLocalDB(db);
    }
  },
  
  getLeadsCount: async (userId: string, period: string): Promise<number> => {
      try {
        const res = await apiService.getLeadsPaginated(userId, 1, 2000, ''); 
        return res.data.length; 
      } catch (e) { return 0; }
  },
  
  getStats: async (userId: string | 'all', period: string): Promise<any[]> => {
      try {
          if (isOfflineMode) throw new Error('Offline');
          const res = await fetch(`${API_URL}/api/chat-logs/${userId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed');
          const logs = await res.json();
          if(!Array.isArray(logs)) return [];
          return [{ label: 'Total', queries: logs.length, solved: logs.length, timestamp: Date.now() }];
      } catch (e) {
          const db = getLocalDB();
          let logs = db.chatLogs;
          if (userId !== 'all') logs = logs.filter((l: any) => l.userId === userId);
          return [{ label: 'Total', queries: logs.length, solved: logs.length, timestamp: Date.now() }];
      }
  },
  
  suggestIcon: async (context: string): Promise<string> => {
      if (!process.env.API_KEY) return 'fa-bell';
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Suggest a FontAwesome icon for: "${context}". Return only class name.`,
          });
          return response.text?.trim() || 'fa-bell';
      } catch (e) { return 'fa-bell'; }
  }
};
