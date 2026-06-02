import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    /* Recharts uses CommonJS modules internally (lodash, etc.)
       This tells Vite to pre-bundle recharts so it works correctly
       with Vite's ESM-based build system */
    include: ['recharts']
  }
})
