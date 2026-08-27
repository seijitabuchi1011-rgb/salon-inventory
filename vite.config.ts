import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isXserver = process.env.DEPLOY_TARGET === 'xserver'

export default defineConfig({
  plugins: [react()],
  base: isXserver ? '/' : '/salon-inventory/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
