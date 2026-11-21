import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      rollupOptions: { output: { format: 'es' } },
    },
  },
  preload: {
    build: {
      rollupOptions: { output: { format: 'es' } },
    },
  },
  renderer: {},
});
