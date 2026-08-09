import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-utils/setupTests.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    exclude: [
      '**/node_modules/**',
      '**/.worktrees/**',
      '**/.claude/worktrees/**',
    ],
  },
});
