import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// fileURLToPath, а не .pathname: шлях може містити кирилицю (Реквізити).
const sharedEntry = fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  resolve: {
    alias: {
      '@rekvizyt/shared': sharedEntry,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
