
import { GoogleGenAI } from "@google/genai";
import { User, Document, WidgetSettings, ChatLog, UserRole, Notification } from "../types";

const API_URL = 'http://localhost:3001/api';
const DB_KEY = 'omnichat_db_v1';

// Cấu hình tài khoản Master mặc định
const MASTER_USER: User = {
  id: 'admin',
  email: 'admin@bibichat.io',
  password: '123456',
  role: 'master',
  createdAt: Date.now(),
  botSettings: { 
    botName: 'BibiBot', 
    primaryColor: '#ec4899', 
    welcomeMessage: 'Xin chào! Hệ thống quản trị Master (Offline Mode).', 
    position: 'right', 
    avatarUrl: '' 
  }
};

// --- HELPER: LOCAL STORAGE FALLBACK ---
const getLocalDB = () => {
  const data = localStorage.getItem(DB_KEY);
  let db;
  
  if (!data) {
    db = { 
      users: [MASTER_USER], 
      documents: [],
      chatLogs: [],
      notifications: []
    };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } else {
    db = JSON.parse(data);
    if (!db.users.find((u: any) => u.id === 'admin')) {
      db.users.unshift(MASTER_USER);
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    }
    // Ensure notifications array exists
    if (!db.notifications) db.notifications = [];
  }
  return db;
};

const saveLocalDB = (db: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const apiService = {
  // --- AUTH ---
  register: async (email: string, password: string): Promise<{success: boolean, message: string, user?: User}> => {
    // 0. Kiểm tra trùng lặp Local trước
    const db = getLocalDB();
    if (db.users.find((u: any) => u.email === email)) {
       return { success: false, message: 'Email này đã được đăng ký rồi nè!' };
    }

    // 1. Tạo user object
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      email,
      password,
      role: 'user',
      createdAt: Date.now(),
      botSettings: {
        botName: 'Trợ lý AI',
        primaryColor: '#8b5cf6',
        welcomeMessage: 'Xin chào!',
        position: 'right',
        avatarUrl: ''
      }
    };

    // 2. Luôn lưu vào LocalStorage (Shadow Save) để đảm bảo Admin nhìn thấy ngay
    db.users.push(newUser);
    saveLocalDB(db);

    // 3. Gọi Server (nếu online)
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
         const serverRes = await res.json();
         // Ưu tiên dùng ID từ server nếu có
         return serverRes;
      }
    } catch (e) {
      console.warn("Server Offline: Registration saved locally.");
    }

    // Trả về kết quả thành công dựa trên LocalStorage
    return { success: true, message: 'Đăng ký thành công (Offline/Hybrid)', user: newUser };
  },

  login: async (email: string, password: string): Promise<{success: boolean, message: string, user?: User}> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error("Server response not ok");
      return await res.json();
    } catch (e) {
      console.warn("Server Offline: Fallback to LocalStorage login");
      const db = getLocalDB();
      
      let user = db.users.find((u: any) => u.email === email && u.password === password);
      
      if (!user && email === MASTER_USER.email && password === MASTER_USER.password) {
        user = MASTER_USER;
        if (!db.users.find((u: any) => u.id === 'admin')) {
           db.users.unshift(MASTER_USER);
           saveLocalDB(db);
        }
      }

      if (user) return { success: true, message: 'Đăng nhập thành công (Offline Mode)', user };
      return { success: false, message: 'Email hoặc mật khẩu không chính xác.' };
    }
  },

  changePassword: async (userId: string, oldPassword: string, newPassword: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(`${API_URL}/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPassword, newPassword })
      });
      if (!res.ok) throw new Error("Server error");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      const idx = db.users.findIndex((u: any) => u.id === userId);
      if (idx === -1) return { success: false, message: "User không tồn tại" };
      if (db.users[idx].password !== oldPassword) return { success: false, message: "Mật khẩu cũ sai" };
      db.users[idx].password = newPassword;
      saveLocalDB(db);
      return { success: true, message: "Đổi mật khẩu thành công (Offline)" };
    }
  },

  // --- ADMIN TOOLS ---
  getAllUsers: async (): Promise<User[]> => {
    const localDB = getLocalDB();
    const localUsers: User[] = localDB.users;

    try {
      const res = await fetch(`${API_URL}/users`);
      if (!res.ok) throw new Error("Server error");
      const serverUsers: User[] = await res.json();

      // Merge: Lấy tất cả user từ Local + Server, loại bỏ trùng lặp email
      const map = new Map();
      
      // Ưu tiên local users trước để đảm bảo những user vừa tạo (chưa sync server) được hiện
      [...localUsers, ...serverUsers].forEach(u => {
        if (!map.has(u.email)) {
          map.set(u.email, u);
        }
      });
      
      const combinedUsers = Array.from(map.values());
      return combinedUsers.filter((u: any) => u.id !== 'admin'); 
    } catch (e) {
      return localUsers.filter(u => u.id !== 'admin');
    }
  },

  resetUserPassword: async (targetUserId: string, newPassword: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(`${API_URL}/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, newPassword })
      });
      if (!res.ok) throw new Error("Server error");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      const idx = db.users.findIndex((u: any) => u.id === targetUserId);
      if (idx !== -1) {
        db.users[idx].password = newPassword;
        saveLocalDB(db);
        return { success: true, message: "Reset thành công (Offline)" };
      }
      return { success: false, message: "Lỗi Offline" };
    }
  },

  deleteUser: async (targetUserId: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUserId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Server error");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      db.users = db.users.filter((u: any) => u.id !== targetUserId);
      db.documents = db.documents.filter((d: any) => d.userId !== targetUserId);
      db.chatLogs = db.chatLogs.filter((l: any) => l.userId !== targetUserId);
      saveLocalDB(db);
      return { success: true, message: "Xóa thành công (Offline)" };
    }
  },

  // --- SETTINGS ---
  updateSettings: async (userId: string, settings: WidgetSettings) => {
    try {
      await fetch(`${API_URL}/settings/${userId}`, {
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

  // --- DOCUMENTS ---
  getDocuments: async (userId: string): Promise<Document[]> => {
    try {
      const res = await fetch(`${API_URL}/documents/${userId}`);
      if (!res.ok) throw new Error("Server error");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      return db.documents.filter((d: any) => d.userId === userId);
    }
  },

  addDocument: async (userId: string, name: string, content: string, type: 'text' | 'file'): Promise<Document> => {
    try {
      const res = await fetch(`${API_URL}/documents/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, userId })
      });
      if (!res.ok) throw new Error("Server error");
      const doc = await res.json();
      if (type === 'file') doc.type = 'file'; 
      return doc;
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
      await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE' });
    } catch (e) {
      const db = getLocalDB();
      db.documents = db.documents.filter((d: any) => d.id !== id);
      saveLocalDB(db);
    }
  },

  // --- ANALYTICS & LOGS ---
  getStats: async (userId: string | 'all', period: 'hour' | 'day' | 'week' | 'month') => {
    const db = getLocalDB();
    let logs = db.chatLogs as ChatLog[];
    
    if (userId !== 'all') {
      logs = logs.filter(l => l.userId === userId);
    }

    const statsMap: Record<string, { queries: number, solved: number }> = {};

    logs.forEach(log => {
      let key = '';
      const date = new Date(log.timestamp);
      
      if (period === 'hour') key = `${date.getHours()}h`;
      else if (period === 'day') key = date.toLocaleDateString('vi-VN');
      else if (period === 'week') key = `Tuần ${Math.ceil(date.getDate() / 7)}`;
      else key = `Tháng ${date.getMonth() + 1}`;

      if (!statsMap[key]) statsMap[key] = { queries: 0, solved: 0 };
      statsMap[key].queries++;
      if (log.isSolved) statsMap[key].solved++;
    });

    return Object.entries(statsMap).map(([label, data]) => ({ label, ...data }));
  },

  getChatLogs: async (userId: string | 'all'): Promise<ChatLog[]> => {
    const db = getLocalDB();
    let logs = db.chatLogs as ChatLog[];
    if (userId !== 'all') {
      logs = logs.filter(l => l.userId === userId);
    }
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const res = await fetch(`${API_URL}/notifications/${userId}`);
      if (!res.ok) throw new Error("Server error");
      return await res.json();
    } catch (e) {
      // Offline fallback logic: Filter and map readBy -> isRead
      const db = getLocalDB();
      const now = Date.now();
      return (db.notifications || [])
        .filter((n: any) => {
          const isTargetUser = (n.userId === 'all' || n.userId === userId);
          if (!isTargetUser) return false;
          // Nếu admin, xem hết. Nếu không, chỉ xem quá khứ.
          if (userId === 'admin') return true;
          return n.scheduledAt ? n.scheduledAt <= now : n.time <= now;
        })
        .map((n: any) => ({
            ...n,
            isRead: Array.isArray(n.readBy) ? n.readBy.includes(userId) : (n.isRead || false)
        }))
        .sort((a: any, b: any) => (b.scheduledAt || b.time) - (a.scheduledAt || a.time));
    }
  },

  getAdminNotifications: async (): Promise<Notification[]> => {
    try {
      const res = await fetch(`${API_URL}/admin/notifications`);
      if (!res.ok) throw new Error("Server error");
      return await res.json();
    } catch (e) {
      const db = getLocalDB();
      return (db.notifications || []).sort((a: any, b: any) => (b.scheduledAt || b.time) - (a.scheduledAt || a.time));
    }
  },

  markNotificationRead: async (id: string, userId: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (e) {
      const db = getLocalDB();
      const n = db.notifications?.find((x: any) => x.id === id);
      if (n) {
        if (!n.readBy) n.readBy = [];
        if (!n.readBy.includes(userId)) {
            n.readBy.push(userId);
        }
        // No longer set boolean isRead globally
        saveLocalDB(db);
      }
    }
  },

  markAllNotificationsRead: async (userId: string): Promise<void> => {
    try {
        await fetch(`${API_URL}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
    } catch (e) {
        const db = getLocalDB();
        const now = Date.now();
        db.notifications?.forEach((n: any) => {
            const isTargetUser = (n.userId === 'all' || n.userId === userId);
            const isVisible = userId === 'admin' ? true : (n.scheduledAt ? n.scheduledAt <= now : n.time <= now);
            
            if (isTargetUser && isVisible) {
                if (!n.readBy) n.readBy = [];
                if (!n.readBy.includes(userId)) {
                    n.readBy.push(userId);
                }
            }
        });
        saveLocalDB(db);
    }
  },

  // Tạo thông báo (Admin)
  createSystemNotification: async (data: Partial<Notification>) => {
    try {
      await fetch(`${API_URL}/notifications/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
    } catch (e) {
      // Offline fallback
      const db = getLocalDB();
      if (!db.notifications) db.notifications = [];
      const now = Date.now();
      db.notifications.push({
        id: Math.random().toString(36).substr(2, 9),
        userId: data.userId || 'all',
        title: data.title || '',
        desc: data.desc || '',
        time: data.scheduledAt || now, 
        scheduledAt: data.scheduledAt || now,
        readBy: [],
        icon: data.icon || 'fa-bell',
        color: data.color || 'text-blue-500',
        bg: data.bg || 'bg-blue-100'
      });
      saveLocalDB(db);
    }
  },

  // Tính năng AI: Gợi ý icon cho thông báo
  suggestIcon: async (text: string): Promise<string> => {
    if (!process.env.API_KEY) return 'fa-bullhorn'; // Fallback nếu không có key

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Prompt được tinh chỉnh để trả về class FontAwesome 6 chuẩn
    const prompt = `Based on the following notification text, suggest the single most appropriate FontAwesome 6 icon class name (e.g., 'fa-bell', 'fa-triangle-exclamation', 'fa-gift', 'fa-champagne-glasses'). ONLY return the class name string, no markdown, no other text.
    
    Text: "${text}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const iconClass = response.text?.trim() || 'fa-bullhorn';
      // Đảm bảo trả về chuỗi sạch (đôi khi AI thêm dấu ngoặc kép hoặc chấm câu)
      return iconClass.replace(/['".]/g, '');
    } catch (error) {
      console.error("AI Icon suggestion failed:", error);
      return 'fa-bullhorn';
    }
  },

  chat: async (userId: string, message: string, botName: string): Promise<string> => {
    let context = "";
    try {
      const res = await fetch(`${API_URL}/documents/${userId}`);
      if(res.ok) {
        const docs: Document[] = await res.json();
        context = docs.map(d => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
      } else { throw new Error("API Docs Error"); }
    } catch (e) {
       const db = getLocalDB();
       context = db.documents.filter((d: any) => d.userId === userId)
         .map((d: any) => `[Tài liệu: ${d.name}]\n${d.content}`).join('\n\n');
    }

    if (!process.env.API_KEY) return "Vui lòng cấu hình API_KEY.";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Bạn là trợ lý AI tên "${botName}". Hãy sử dụng kho kiến thức sau: \n${context}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: message,
        config: { systemInstruction }
      });
      
      const reply = response.text || "Tôi không thể trả lời.";
      
      const db = getLocalDB();
      const newLog: ChatLog = {
        id: Math.random().toString(36).substring(2, 9),
        userId,
        customerSessionId: 'anon-session',
        query: message,
        answer: reply,
        timestamp: Date.now(),
        tokens: message.length + (reply?.length || 0),
        isSolved: !reply.includes("không có thông tin") && !reply.includes("Xin lỗi")
      };
      db.chatLogs.push(newLog);
      saveLocalDB(db);

      return reply;
    } catch (e) {
      console.error(e);
      return "Lỗi AI hoặc mất kết nối mạng.";
    }
  }
};
