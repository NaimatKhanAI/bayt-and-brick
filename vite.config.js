import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Preserve the browser's Host header so the API can validate same-origin requests.
const backend = { target: 'http://127.0.0.1:3001', changeOrigin: false }
export default defineConfig({ plugins: [react()], server: { host: '127.0.0.1', proxy: { '/api': { ...backend }, '/uploads': { ...backend } } } })
