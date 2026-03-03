import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/frontend',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@frontend': resolve(__dirname, 'src/frontend'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
