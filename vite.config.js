import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    minify: false,
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/dom-stub.js'],
  },
});