import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number.parseInt(env.VITE_DEV_PORT || '5178', 10);
  const backendPort = env.PORT || '3008';
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${backendPort}`;

  return {
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
  };
});
