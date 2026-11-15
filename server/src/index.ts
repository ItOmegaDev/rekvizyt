import { createApp } from './app.js'
import { config } from './config.js'
import { closeDb, initDb } from './db.js'
import { seedInitialData } from './seed.js'

function main() {
  initDb(config.dataDir)
  seedInitialData()

  const app = createApp()
  const server = app.listen(config.PORT, () => {
    console.log(`🚀 API: http://localhost:${config.PORT}/api/health`)
    console.log(`📁 Дані: ${config.dataDir}`)
  })

  const shutdown = (signal: string) => {
    console.log(`\n${signal} — завершуюсь…`)
    server.close()
    closeDb()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main()
