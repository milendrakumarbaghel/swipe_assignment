import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const apiProxyTarget = process.env.VITE_API_PROXY || 'http://localhost:4000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
