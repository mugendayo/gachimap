import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 標準的な Vite + React 構成。外部 API/DB は使わず public/items.json のみ参照する。
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
})
