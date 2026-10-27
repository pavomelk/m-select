import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // The demo page lives in demo/, so `npm run dev` opens it rather than the
    // project root, which has no page of its own.
    open: '/demo/index.html',
    watch: {
      usePolling: true,
    },
  },
  build: {
    minify: false,
    // Vite infers its entry from an index.html at the root, and there is none
    // now that the demo page has moved into demo/.
    rollupOptions: {
      input: 'demo/index.html',
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/dom-stub.js'],
  },
});