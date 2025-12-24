
import { io, Socket } from 'socket.io-client';
import { apiService } from './apiService';

const SERVER_URL = process.env.SERVER_URL || 'https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket) return;

    const token = apiService.getToken();
    if (!token) {
        console.error("Socket Auth Failed: No Token");
        return;
    }

    // SECURITY UPDATE: Pass token in 'auth' object, not userId in query
    this.socket = io(SERVER_URL, {
      auth: {
        token: token 
      },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Secure Socket Layer');
    });

    this.socket.on('connect_error', (err) => {
      console.error("Socket Connection Error:", err.message);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  emit(event: string, data: any) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  off(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export const socketService = new SocketService();
