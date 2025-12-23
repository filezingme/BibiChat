import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      // Logic ưu tiên: Biến môi trường hệ thống (Vercel) -> file .env -> mặc định
      'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || env.SERVER_URL || 'https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app'),
      'process.env.CLIENT_URL': JSON.stringify(process.env.CLIENT_URL || env.CLIENT_URL || 'https://bibi-chat.vercel.app')
    }
  };
});