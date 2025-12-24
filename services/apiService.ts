
import { GoogleGenAI } from "@google/genai";
import { User, Document, WidgetSettings, ChatLog, UserRole, Notification, Lead, PluginConfig, DirectMessage, ConversationUser, Reaction } from "../types";

// URL Backend - Sử dụng biến môi trường hoặc fallback về URL chính thức Koyeb
const API_URL = process.env.SERVER_URL || 'https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app';
const DB_KEY = 'omnichat_db_v1';

const MASTER_USER: User = {
  id: 'admin',
  email: 'admin@bibichat.io',
  password: '123456',
  role: 'master',
  createdAt: Date.now(),
  botSettings: { 
    botName: 'BibiBot', 
    primaryColor: '#ec4899', 
    welcomeMessage: 'Xin chào! Hệ thống quản trị Master (Chế độ Offline).', 
    position: 'bottom-right', 
    avatarUrl: '' 
  }
};

const getLocalDB = () => {
  const data = localStorage.getItem(DB_KEY);
  let db;
  if (!data) {
    db = { users: [MASTER_USER], documents: [], chatLogs: [], notifications: [], leads: [] };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } else {
    db = JSON.parse(data);
    if (!db.notifications) db.notifications = [];
    if (!db.leads) db.leads = [];
    if (!db.chatLogs) db.chatLogs = [];
  }
  return db;
};

const saveLocalDB = (db: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// Helper để lấy API Key từ Env hoặc LocalStorage (cho phép debug nhanh)
const getApiKey = () => {
    return process.env.API_KEY || localStorage.getItem('API_KEY') || localStorage.getItem('omnichat_api_key') || '';
};

export const apiService = {
  // --- SYSTEM CHECK ---
  checkHealth: async (): Promise<{ online: boolean, message: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        return { 
          online: data.status === 'ok',
          message: data.message 
        };
      }
      return { online: false, message: 'Không thể kết nối máy chủ' };
    } catch (e) {
      return { online: false, message: 'Lỗi kết nối mạng' };
    }
  },

  // --- UPLOAD ---
  uploadFile: async (file: File): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_URL}/api/upload/proxy`, {
          method: 'POST',
          body: formData
      });
      
      if (!res.ok) {
          throw new Error('Upload failed');
      }
      return await res.json();
  },

  // --- DIRECT MESSAGING ---
  findUserByEmail: async (email: string): Promise<{ success: boolean, user?: {id: string, email: string, role: string}, message?: string }> => {
      try {
          const res = await fetch(`${API_URL}/api/dm/find`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Lỗi kết nối: Không thể tìm kiếm người dùng.' };
      }
  },

  getConversations: async (userId: string): Promise<ConversationUser[]> => {
      try {
          const res = await fetch(`${API_URL}/api/dm/conversations/${userId}`);
          return await res.json();
      } catch (e) {
          console.error("Lỗi tải hội thoại:", e);
          return [];
      }
  },

  getDirectMessages: async (userId: string, otherUserId: string): Promise<DirectMessage[]> => {
      try {
          const res = await fetch(`${API_URL}/api/dm/history/${userId}/${otherUserId}`);
          return await res.json();
      } catch (e) {
          console.error("Lỗi tải tin nhắn:", e);
          return [];
      }
  },

  sendDirectMessage: async (senderId: string, receiverId: string, content: string, type: 'text' | 'sticker' | 'image' = 'text', replyToId?: string, groupId?: string): Promise<DirectMessage> => {
      try {
          const res = await fetch(`${API_URL}/api/dm/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId, receiverId, content, type, replyToId, groupId })
          });
          return await res.json();
      } catch (e) {
          throw new Error("Gửi tin nhắn thất bại");
      }
  },

  reactToMessage: async (messageId: string, userId: string, emoji: string): Promise<{ success: boolean, reactions?: Reaction[] }> => {
      try {
          const res = await fetch(`${API_URL}/api/dm/react`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId, userId, emoji })
          });
          return await res.json();
      } catch (e) {
          return { success: false };
      }
  },

  getUnreadMessagesCount: async (userId: string): Promise<number> => {
      try {
          const res = await fetch(`${API_URL}/api/dm/unread/${userId}`);
          const data = await res.json();
          return data.count || 0;
      } catch (e) {
          return 0;
      }
  },

  // --- AUTH ---
  register: async (email: string, password: string): Promise<{success: boolean, message: string, user?: User}> => {
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const serverRes = await res.json();
      if (res.ok && serverRes.success) return serverRes;
      else return { success: false, message: serverRes.message || 'Lỗi đăng ký từ máy chủ' };
    } catch (e) {
      console.warn("Máy chủ ngoại tuyến: Đăng ký được lưu cục bộ.");
      const db = getLocalDB();
      if (db.users.find((u: any) => u.email === email)) return { success: false, message: 'Email này đã được đăng ký (Chế độ Offline)' };
      const newUser: User = {
        id: Math.random().toString(36).substring(2, 11),
        email,
        password,
        role: 'user',
        createdAt: Date.now(),
        botSettings: { botName: 'Trợ lý AI', primaryColor: '#8b5cf6', welcomeMessage: 'Xin chào!', position: 'bottom-right', avatarUrl: '' }
      };
      db.users.push(newUser);
      saveLocalDB(db);
      return { success: true, message: 'Đăng ký thành công (Chế độ Offline)', user: newUser };
    }
  },

  login: async (email: string, password: string): Promise<{success: boolean, message: string, user?: User}> => {
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
         const errData = await res.json();
         return { success: false, message: errData.message || 'Lỗi đăng nhập' };
      }
      return await res.json();
    } catch (e) {
      console.warn("Máy chủ ngoại tuyến: Đăng nhập bằng dữ liệu cục bộ");
      const db = getLocalDB();
      let user = db.users.find((u: any) => u.email === email && u.password === password);
      if (!user && email === MASTER_USER.email && password === MASTER_USER.password) user = MASTER_USER;
      if (user) return { success: true, message: 'Đăng nhập thành công (Chế độ Offline)', user };
      return { success: false, message: 'Không thể kết nối máy chủ & Sai thông tin Offline.' };
    }
  },

  changePassword: async (userId: string, oldPassword: string, newPassword: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(`${API_URL}/api/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPassword, newPassword })
      });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      const idx = db.users.findIndex((u: any) => u.id === userId);
      if (idx === -1) return { success: false, message: "Người dùng không tồn tại" };
      if (db.users[idx].password !== oldPassword) return { success: false, message: "Mật khẩu cũ không đúng" };
      db.users[idx].password = newPassword;
      saveLocalDB(db);
      return { success: true, message: "Đổi mật khẩu thành công (Chế độ Offline)" };
    }
  },

  // --- ADMIN TOOLS ---
  getAllUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_URL}/api/users`);
      if (!res.ok) throw new Error("Lỗi máy chủ");
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (e) {
      const localDB = getLocalDB();
      return localDB.users;
    }
  },

  getUsersPaginated: async (page: number, limit: number, search: string): Promise<{ data: User[], total: number, totalPages: number }> => {
      try {
          const res = await fetch(`${API_URL}/api/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
          if (!res.ok) throw new Error("Lỗi máy chủ");
          return await res.json();
      } catch (e) {
          const localDB = getLocalDB();
          // Filter out master role locally
          let filtered = localDB.users.filter((u: any) => u.role !== 'master');
          
          if(search) {
             filtered = filtered.filter((u: any) => 
                u.email.toLowerCase().includes(search.toLowerCase()) || 
                (u.botSettings?.botName || '').toLowerCase().includes(search.toLowerCase())
             );
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
      const res = await fetch(`${API_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, newPassword })
      });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      const idx = db.users.findIndex((u: any) => u.id === targetUserId);
      if (idx !== -1) {
        db.users[idx].password = newPassword;
        saveLocalDB(db);
        return { success: true, message: "Reset thành công (Chế độ Offline)" };
      }
      return { success: false, message: "Lỗi Offline" };
    }
  },

  deleteUser: async (targetUserId: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${targetUserId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      db.users = db.users.filter((u: any) => u.id !== targetUserId);
      saveLocalDB(db);
      return { success: true, message: "Xóa thành công (Chế độ Offline)" };
    }
  },

  // --- SETTINGS ---
  updateSettings: async (userId: string, settings: WidgetSettings) => {
    try {
      await fetch(`${API_URL}/api/settings/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (e) {
      const db = getLocalDB();
      const idx = db.users.findIndex((u: any) => u.id === userId);
      if (idx !== -1) {
        db.users[idx].botSettings = settings;
        saveLocalDB(db);
      }
    }
  },

  // --- PLUGINS ---
  getPlugins: async (userId: string): Promise<PluginConfig> => {
    try {
        const res = await fetch(`${API_URL}/api/plugins/${userId}`);
        if (!res.ok) throw new Error("Lỗi tải tiện ích");
        return await res.json();
    } catch (e) {
        const db = getLocalDB();
        const user = db.users.find((u: any) => u.id === userId);
        return user?.plugins || { autoOpen: { enabled: false, delay: 5 }, social: { enabled: false, zalo: '', phone: '' }, leadForm: { enabled: false, title: '', trigger: 'manual' } };
    }
  },

  updatePlugins: async (userId: string, plugins: PluginConfig) => {
    try {
        await fetch(`${API_URL}/api/plugins/${userId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(plugins)
        });
    } catch (e) {
        const db = getLocalDB();
        const idx = db.users.findIndex((u: any) => u.id === userId);
        if (idx !== -1) {
            db.users[idx].plugins = plugins;
            saveLocalDB(db);
        }
    }
  },

  // --- LEADS (PAGINATED) ---
  getLeadsPaginated: async (userId: string, page: number, limit: number, search: string = ''): Promise<{ data: Lead[], pagination: any }> => {
    try {
        const res = await fetch(`${API_URL}/api/leads/${userId}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        if (!res.ok) throw new Error("Lỗi tải danh sách khách hàng");
        return await res.json();
    } catch (e) {
        // Fallback for offline mode (non-paginated simulation)
        const db = getLocalDB();
        let leads = (db.leads || []).filter((l: any) => l.userId === userId);
        if(search) {
            const s = search.toLowerCase();
            leads = leads.filter((l: any) => 
                (l.name && l.name.toLowerCase().includes(s)) || 
                (l.phone && String(l.phone).includes(s)) ||
                (l.email && l.email.toLowerCase().includes(s))
            );
        }
        return { data: leads, pagination: { total: leads.length, page: 1, limit: 1000, totalPages: 1 } };
    }
  },
  
  // Legacy support
  getLeads: async (userId: string): Promise<Lead[]> => {
      const res = await apiService.getLeadsPaginated(userId, 1, 1000, '');
      return res.data;
  },

  getLeadsCount: async (userId: string, period: string): Promise<number> => {
      try {
        // Fetch reasonably large amount to count client side since API does not support filtering by date yet
        const res = await apiService.getLeadsPaginated(userId, 1, 2000, ''); 
        const leads = res.data;
        const now = Date.now();
        let startTime = 0;
        
        if (period === 'hour') startTime = now - 60 * 60 * 1000;
        else if (period === 'day') startTime = now - 24 * 60 * 60 * 1000;
        else if (period === 'week') startTime = now - 7 * 24 * 60 * 60 * 1000;
        else startTime = now - 30 * 24 * 60 * 60 * 1000;

        return leads.filter(l => l.createdAt >= startTime).length;
      } catch (e) {
          return 0;
      }
  },

  submitLead: async (userId: string, name: string, phone: string, email: string, isTest: boolean = false): Promise<Lead> => {
    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, name, phone, email, isTest })
        });
        return await res.json();
    } catch (e) {
        const db = getLocalDB();
        if (!db.leads) db.leads = [];
        const newLead: Lead = { 
            id: Math.random().toString(36).substr(2, 9), 
            userId, 
            name, 
            phone, 
            email, 
            source: 'chat_form', 
            status: 'new', 
            createdAt: Date.now(),
            isTest: isTest
        };
        db.leads.push(newLead);
        saveLocalDB(db);
        return newLead;
    }
  },
  
  updateLeadStatus: async (leadId: string, status: string) => {
    try {
        await fetch(`${API_URL}/api/leads/${leadId}/status`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status })
        });
    } catch (e) {
        const db = getLocalDB();
        const idx = db.leads.findIndex((l: any) => l.id === leadId);
        if (idx !== -1) {
            db.leads[idx].status = status;
            saveLocalDB(db);
        }
    }
  },

  deleteLead: async (leadId: string) => {
    try {
      await fetch(`${API_URL}/api/leads/${leadId}`, { method: 'DELETE' });
    } catch (e) {
      const db = getLocalDB();
      db.leads = (db.leads || []).filter((l: any) => l.id !== leadId);
      saveLocalDB(db);
    }
  },

  // --- DOCUMENTS ---
  getDocuments: async (userId: string): Promise<Document[]> => {
    try {
      const res = await fetch(`${API_URL}/api/documents/${userId}`);
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      return db.documents.filter((d: any) => d.userId === userId);
    }
  },

  addDocument: async (userId: string, name: string, content: string, type: 'text' | 'file'): Promise<Document> => {
    try {
      const res = await fetch(`${API_URL}/api/documents/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, userId })
      });
      if (!res.ok) throw new Error("Lỗi máy chủ");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      const newDoc: Document = {
        id: Math.random().toString(36).substring(2, 11),
        userId,
        name,
        content,
        type,
        status: 'indexed',
        createdAt: Date.now()
      };
      db.documents.push(newDoc);
      saveLocalDB(db);
      return newDoc;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE' });
    } catch (e) {
      const db = getLocalDB();
      db.documents = db.documents.filter((d: any) => d.id !== id);
      saveLocalDB(db);
    }
  },

  // --- ANALYTICS & LOGS (PAGINATED CHAT - HYBRID ONLINE/OFFLINE) ---
  
  getChatSessionsPaginated: async (userId: string | 'all', page: number, limit: number, filterUserId: string = 'all'): Promise<{ data: any[], pagination: any }> => {
      try {
          const res = await fetch(`${API_URL}/api/chat-sessions/${userId}?page=${page}&limit=${limit}&filterUserId=${filterUserId}`);
          if(!res.ok) throw new Error("Lỗi tải danh sách chat");
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
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
          
          return { 
              data: sessions.slice(startIndex, startIndex + limit), 
              pagination: { 
                  total, 
                  page, 
                  limit, 
                  totalPages: Math.ceil(total / limit) 
              }
          };
      }
  },

  getChatMessages: async (userId: string | 'all', sessionId: string): Promise<ChatLog[]> => {
      try {
          const res = await fetch(`${API_URL}/api/chat-messages/${userId}/${sessionId}`);
          if(!res.ok) throw new Error("Lỗi tải tin nhắn");
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          let logs = db.chatLogs || [];
          if (userId !== 'all' && userId !== 'admin') {
              logs = logs.filter((l: any) => l.userId === userId);
          }
          return logs.filter((l: any) => l.customerSessionId === sessionId)
                     .sort((a: any, b: any) => a.timestamp - b.timestamp);
      }
  },

  // --- STATS ---
  getStats: async (userId: string | 'all', period: string): Promise<any[]> => {
      try {
          const res = await fetch(`${API_URL}/api/chat-logs/${userId}`);
          if (!res.ok) throw new Error("Failed to fetch logs for stats");
          const logs: ChatLog[] = await res.json();
          
          const now = Date.now();
          let startTime = 0;
          
          if (period === 'hour') startTime = now - 60 * 60 * 1000;
          else if (period === 'day') startTime = now - 24 * 60 * 60 * 1000;
          else if (period === 'week') startTime = now - 7 * 24 * 60 * 60 * 1000;
          else startTime = now - 30 * 24 * 60 * 60 * 1000;

          const filteredLogs = logs.filter(l => l.timestamp >= startTime);
          
          const groups: Record<string, { count: number, timestamp: number }> = {};

          filteredLogs.forEach(log => {
              const date = new Date(log.timestamp);
              let label = '';
              let sortKey = 0;

              if (period === 'hour') {
                  const minutes = Math.floor(date.getMinutes() / 5) * 5;
                  const d = new Date(date);
                  d.setMinutes(minutes, 0, 0);
                  label = `${d.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  sortKey = d.getTime();
              } else if (period === 'day') {
                  const h = date.getHours();
                  label = `${h.toString().padStart(2, '0')}:00`;
                  const d = new Date(date);
                  d.setMinutes(0, 0, 0);
                  sortKey = d.getTime();
              } else if (period === 'week') {
                  label = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  sortKey = d.getTime();
              } else {
                  label = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  sortKey = d.getTime();
              }
              
              if (!groups[label]) {
                  groups[label] = { count: 0, timestamp: sortKey };
              }
              groups[label].count++;
          });

          return Object.entries(groups)
            .map(([label, data]) => ({
              label,
              queries: data.count,
              solved: data.count,
              timestamp: data.timestamp
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

      } catch (e) {
          return [];
      }
  },

  // --- CHAT WIDGET ---
  chat: async (userId: string, message: string, botName: string, sessionId: string): Promise<string> => {
      try {
          const res = await fetch(`${API_URL}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, message, botName, sessionId })
          });
          if (!res.ok) throw new Error("Chat failed");
          const data = await res.json();
          return data.text;
      } catch (e) {
          console.error(e);
          throw e;
      }
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (userId: string): Promise<Notification[]> => {
      try {
          const res = await fetch(`${API_URL}/api/notifications/${userId}`);
          if (!res.ok) throw new Error("Failed");
          return await res.json();
      } catch (e) {
          const db = getLocalDB();
          return (db.notifications || []).filter((n: any) => n.userId === 'all' || n.userId === userId).map((n: any) => ({...n, isRead: (n.readBy||[]).includes(userId)}));
      }
  },

  markNotificationRead: async (id: string, userId: string) => {
      try {
          await fetch(`${API_URL}/api/notifications/${id}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId })
          });
      } catch (e) {
          const db = getLocalDB();
          const n = db.notifications?.find((x: any) => x.id === id);
          if(n) {
              if(!n.readBy) n.readBy = [];
              if(!n.readBy.includes(userId)) n.readBy.push(userId);
              saveLocalDB(db);
          }
      }
  },

  markAllNotificationsRead: async (userId: string) => {
      try {
          await fetch(`${API_URL}/api/notifications/read-all`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId })
          });
      } catch (e) {
           const db = getLocalDB();
           if(db.notifications) {
               db.notifications.forEach((n: any) => {
                   if(n.userId === 'all' || n.userId === userId) {
                       if(!n.readBy) n.readBy = [];
                       if(!n.readBy.includes(userId)) n.readBy.push(userId);
                   }
               });
               saveLocalDB(db);
           }
      }
  },

  createSystemNotification: async (notification: any) => {
      try {
          await fetch(`${API_URL}/api/notifications/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(notification)
          });
      } catch (e) {
          const db = getLocalDB();
          if(!db.notifications) db.notifications = [];
          db.notifications.push({ ...notification, id: Date.now().toString(), readBy: [] });
          saveLocalDB(db);
      }
  },

  suggestIcon: async (context: string): Promise<string> => {
      if (!process.env.API_KEY) return 'fa-bell';
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Suggest a single FontAwesome 6 icon class (e.g., fa-bell) for: "${context}". Return ONLY the class name.`,
          });
          return response.text?.trim() || 'fa-bell';
      } catch (e) {
          return 'fa-bell';
      }
  }
};
