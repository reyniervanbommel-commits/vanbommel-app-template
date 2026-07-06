import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://localhost:3008',
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
