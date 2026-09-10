import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev-only proxy so the frontend can always call same-origin `/api/...`
// (see src/api/client.ts) without CORS config, both now and once this is
// served behind a reverse proxy on a remote server.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
