
export enum View {
  DASHBOARD = 'dashboard',
  KNOWLEDGE_BASE = 'knowledge_base',
  WIDGET_CONFIG = 'widget_config',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  DEPLOYMENT_GUIDE = 'deployment_guide',
  CUSTOMER_MANAGEMENT = 'customer_management',
  CHAT_HISTORY = 'chat_history',
  NOTIFICATION_MANAGER = 'notification_manager',
  LEADS = 'leads'
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
  userId: string; 
  customerSessionId: string;
  query: string;  
  answer: string; 
  timestamp: number;
  tokens: number;
  isSolved: boolean;
}

export interface Lead {
  id: string;
  userId: string; // Bot owner ID
  name: string;
  phone: string;
  email: string;
  source: string; // 'chat_form'
  createdAt: number;
  status: 'new' | 'contacted' | 'converted';
  isTest?: boolean; // New field to mark test leads
}

export interface PluginConfig {
  autoOpen: { enabled: boolean; delay: number };
  social: { enabled: boolean; zalo: string; phone: string };
  leadForm: { enabled: boolean; title: string; trigger: 'on_open' | 'manual' };
}

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  botSettings: WidgetSettings;
  plugins?: PluginConfig; // New field
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
  userId: string; 
  title: string;
  desc: string;
  time: number; 
  scheduledAt: number; 
  readBy: string[]; 
  isRead?: boolean; 
  icon: string;
  color: string;
  bg: string;
}
