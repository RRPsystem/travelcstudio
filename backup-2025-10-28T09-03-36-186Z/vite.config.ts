import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    fs: {
      // Exclude supabase functions from being served
      deny: ['**/supabase/functions/**'],
    },
  },
});
