import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Бандлимо лише workspace-пакет; решта node_modules і вбудовані модулі лишаються зовнішніми.
  noExternal: ['@rekvizyt/shared'],
})
