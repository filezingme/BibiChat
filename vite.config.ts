
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || 'https://fuzzy-cosette-filezingme-org-64d51f5d.koyeb.app'),
    'process.env.CLIENT_URL': JSON.stringify(process.env.CLIENT_URL || 'https://bibi-chat.vercel.app')
  }
});
