import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: 'public',
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
