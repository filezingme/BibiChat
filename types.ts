
export enum View {
  DASHBOARD = 'dashboard',
  KNOWLEDGE_BASE = 'knowledge_base',
  WIDGET_CONFIG = 'widget_config',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  DEPLOYMENT_GUIDE = 'deployment_guide',
  CUSTOMER_MANAGEMENT = 'customer_management',
  CHAT_HISTORY = 'chat_history',
  NOTIFICATION_MANAGER = 'notification_manager'
}

export type UserRole = 'master' | 'user';

export interface Document {
  id: string;
  userId: string;
  name: string;
  content: string;
  type: 'file' | 'url' | 'text';
  status: 'indexed' | 'processing';
  createdAt: number;
}

export interface ChatLog {
  id: string;
  userId: string; // ID của chủ sở hữu bot
  customerSessionId: string;
  query: string;  // Nội dung người dùng hỏi
  answer: string; // Nội dung AI trả lời
  timestamp: number;
  tokens: number;
  isSolved: boolean;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  botSettings: WidgetSettings;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface WidgetSettings {
  primaryColor: string;
  botName: string;
  welcomeMessage: string;
  position: 'right' | 'left';
  avatarUrl: string;
}

export interface AnalyticsData {
  label: string;
  queries: number;
  solved: number;
}

export interface Notification {
  id: string;
  userId: string; // 'all' hoặc userId cụ thể
  title: string;
  desc: string;
  time: number; // Thời gian tạo/hiển thị thực tế
  scheduledAt: number; // Thời gian hẹn giờ
  readBy: string[]; // Danh sách ID người dùng đã đọc
  isRead?: boolean; // Computed field cho frontend (không lưu trong DB nếu dùng readBy)
  icon: string;
  color: string;
  bg: string;
}
