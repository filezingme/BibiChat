
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Logic ưu tiên: Biến môi trường -> Nếu đang Dev thì dùng Localhost -> Mặc định Production
  const defaultServerUrl = mode === 'development' 
    ? 'http://localhost:3000' 
    : 'https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || env.SERVER_URL || defaultServerUrl),
      'process.env.CLIENT_URL': JSON.stringify(process.env.CLIENT_URL || env.CLIENT_URL || 'https://bibichat.me')
    }
  };
});
