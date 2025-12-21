import { User, PluginConfig, Lead, Notification, Document, ChatLog, WidgetSettings } from '../types';
import { GoogleGenAI } from "@google/genai";

// Use environment variable for API URL or default to localhost
const API_URL = 'http://localhost:3001';

export const apiService = {
  checkHealth: async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      return await res.json();
    } catch (e) {
      return { online: false };
    }
  },

  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  register: async (email, password) => {
    const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  changePassword: async (userId, oldPassword, newPassword) => {
      const res = await fetch(`${API_URL}/api/user/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, oldPassword, newPassword })
      });
      return res.json();
  },

  // Users
  getAllUsers: async (): Promise<User[]> => {
      const res = await fetch(`${API_URL}/api/users`);
      const json = await res.json();
      return json.data || [];
  },

  getUsersPaginated: async (page: number, limit: number, search: string): Promise<{ data: User[], total: number, totalPages: number }> => {
      try {
          const res = await fetch(`${API_URL}/api/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
          if (!res.ok) throw new Error("Lỗi máy chủ");
          const json = await res.json();
          if (json.pagination) {
              return {
                  data: json.data,
                  total: json.pagination.total,
                  totalPages: json.pagination.totalPages
              };
          }
          return json;
      } catch (e) {
          return { data: [], total: 0, totalPages: 0 };
      }
  },

  deleteUser: async (id: string) => {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE' });
      return res.json();
  },

  resetUserPassword: async (targetUserId: string, newPassword: string) => {
      const res = await fetch(`${API_URL}/api/admin/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId, newPassword })
      });
      return res.json();
  },

  // Documents
  getDocuments: async (userId: string): Promise<Document[]> => {
      const res = await fetch(`${API_URL}/api/documents/${userId}`);
      return res.json();
  },

  addDocument: async (userId: string, name: string, content: string, type: 'text' | 'file') => {
      const res = await fetch(`${API_URL}/api/documents/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name, content })
      });
      return res.json();
  },

  deleteDocument: async (id: string) => {
      await fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE' });
  },

  // Settings
  updateSettings: async (userId: string, settings: WidgetSettings) => {
      await fetch(`${API_URL}/api/settings/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
      });
  },

  // Plugins
  getPlugins: async (userId: string): Promise<PluginConfig> => {
      const res = await fetch(`${API_URL}/api/plugins/${userId}`);
      if (!res.ok) return { autoOpen: {enabled: false, delay: 5}, social: {enabled: false, zalo: '', phone: ''}, leadForm: {enabled: false, title: '', trigger: 'manual'} };
      return res.json();
  },

  updatePlugins: async (userId: string, plugins: PluginConfig) => {
      await fetch(`${API_URL}/api/plugins/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plugins)
      });
  },

  // Leads
  getLeadsPaginated: async (userId: string, page: number, limit: number, search: string) => {
      const res = await fetch(`${API_URL}/api/leads/${userId}?page=${page}&limit=${limit}&search=${search}`);
      return res.json();
  },

  submitLead: async (userId: string, name: string, phone: string, email?: string) => {
      await fetch(`${API_URL}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name, phone, email })
      });
  },

  updateLeadStatus: async (id: string, status: string) => {
      await fetch(`${API_URL}/api/leads/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
      });
  },

  deleteLead: async (id: string) => {
      await fetch(`${API_URL}/api/leads/${id}`, { method: 'DELETE' });
  },

  // Notifications
  getNotifications: async (userId: string): Promise<Notification[]> => {
      const res = await fetch(`${API_URL}/api/notifications/${userId}`);
      return res.json();
  },

  markNotificationRead: async (id: string, userId: string) => {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
      });
  },

  markAllNotificationsRead: async (userId: string) => {
      await fetch(`${API_URL}/api/notifications/read-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
      });
  },

  createSystemNotification: async (notif: any) => {
      await fetch(`${API_URL}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notif)
      });
  },

  // Chat Logs & Stats
  getStats: async (userId: string, period: string) => {
      try {
        const res = await fetch(`${API_URL}/api/chat-logs/${userId}`);
        const logs: ChatLog[] = await res.json();
        
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        const stats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now - i * oneDay);
            const label = date.toLocaleDateString('vi-VN', { weekday: 'short' });
            // Filter logs for this day
            const dayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === date.toDateString());
            stats.push({
                label,
                queries: dayLogs.length,
                solved: dayLogs.filter(l => l.isSolved).length
            });
        }
        return stats;
      } catch (e) {
        return [];
      }
  },
  
  chat: async (userId: string, message: string, botName: string, sessionId: string) => {
      const res = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, message, botName, sessionId })
      });
      const json = await res.json();
      return json.text;
  },

  getChatSessionsPaginated: async (userId: string, page: number, limit: number, filterUserId: string) => {
      const res = await fetch(`${API_URL}/api/chat-sessions/${userId}?page=${page}&limit=${limit}&filterUserId=${filterUserId}`);
      return res.json();
  },

  getChatMessages: async (userId: string, sessionId: string) => {
      const res = await fetch(`${API_URL}/api/chat-messages/${userId}/${sessionId}`);
      return res.json();
  },

  // Direct Messages
  getConversations: async (userId: string) => {
      const res = await fetch(`${API_URL}/api/dm/conversations/${userId}`);
      return res.json();
  },
  
  getDirectMessages: async (userId: string, otherUserId: string) => {
      const res = await fetch(`${API_URL}/api/dm/history/${userId}/${otherUserId}`);
      return res.json();
  },
  
  sendDirectMessage: async (senderId: string, receiverId: string, content: string, type: string, replyToId?: string) => {
      await fetch(`${API_URL}/api/dm/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId, receiverId, content, type, replyToId })
      });
  },
  
  reactToMessage: async (messageId: string, userId: string, emoji: string) => {
      await fetch(`${API_URL}/api/dm/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, userId, emoji })
      });
  },

  findUserByEmail: async (email: string) => {
      const res = await fetch(`${API_URL}/api/dm/find`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
      });
      return res.json();
  },

  getUnreadMessagesCount: async (userId: string) => {
      const res = await fetch(`${API_URL}/api/dm/unread/${userId}`);
      const json = await res.json();
      return json.count || 0;
  },

  // AI Helpers
  suggestIcon: async (context: string) => {
      // Use Gemini to suggest FontAwesome icon
      if (!process.env.API_KEY) return 'fa-star';
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest a FontAwesome 6 icon class (e.g., fa-user) for this notification content: "${context}". Only return the class name.`,
          });
          return response.text?.trim() || 'fa-bell';
      } catch (e) {
          return 'fa-bell';
      }
  }
};