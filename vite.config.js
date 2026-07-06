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
    // Split zware, zelden-wijzigende libraries in eigen vendor-chunks. Dit haalt ze uit de
    // hoofdbundle (betere caching tussen deploys) en werkt samen met de route-lazy-loading
    // in App.jsx: recharts belandt zo enkel in de admin-chunk-keten, niet in de initiële load.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-fluentui': ['@fluentui/react-components', '@fluentui/react-icons'],
          'vendor-charts': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
