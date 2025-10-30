import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/erlc-cad/', // 👈 must match your GitHub repo name
})

