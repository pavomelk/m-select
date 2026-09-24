import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  build: {
    minify: false,
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/dom-stub.js'],
  },
});