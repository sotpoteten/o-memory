import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const apiUrl = process.env.MEM_API_URL ?? 'http://localhost:5126'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiUrl,
      '/images': apiUrl,
    },
  },
  test: {
    environment: 'node',
  },
})
