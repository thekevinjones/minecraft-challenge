import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Project Pages serves under /minecraft-challenge/ in production; dev stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/minecraft-challenge/' : '/',
  plugins: [react()],
}))
