
import { io, Socket } from 'socket.io-client';

// Use the same URL logic as apiService
const SERVER_URL = process.env.SERVER_URL || 'https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket) return;

    this.socket = io(SERVER_URL, {
      query: { userId },
      transports: ['websocket'], // Force websocket to reduce HTTP overhead
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Real-time Server');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Real-time Server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Generic event listener
  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  // Generic event emitter
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
