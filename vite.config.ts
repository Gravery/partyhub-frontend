import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'tslib']
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: 'http://localhost:3333',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
