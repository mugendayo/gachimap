import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 標準的な Vite + React 構成。外部 API/DB は使わず public/items.json のみ参照する。
// GitHub Pages では https://mugendayo.github.io/gachimap/ で配信するため
// 本番ビルド時のみ base を '/gachimap/' にする（dev は '/'）。
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/gachimap/' : '/',
  server: {
    host: true,
  },
}))
