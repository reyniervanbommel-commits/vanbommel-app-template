import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number.parseInt(process.env.VITE_DEV_PORT || '5178', 10);
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3008';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number.isFinite(devPort) && devPort > 0 ? devPort : 5178,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
