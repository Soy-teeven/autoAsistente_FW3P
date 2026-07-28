import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    open: false,
    allowedHosts: true
  },
  preview: {
    port: 4000,
    allowedHosts: true
  }
});
