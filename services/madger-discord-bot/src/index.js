import pino from 'pino'
import { createBot } from './bot.js'
import { loadConfig } from './config.js'
import { createStore } from './store.js'

const config = loadConfig()
const logger = pino({ level: config.LOG_LEVEL, redact: { paths: ['DISCORD_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', '*.token', '*.authorization'], censor: '[REDACTED]' } })
const store = createStore(config)
const client = createBot({ config, store, logger })

let stopping = false
async function shutdown(signal) {
  if (stopping) return
  stopping = true
  logger.info({ signal }, 'Stopping MADGER_Bot Discord transport')
  client.destroy()
  setTimeout(() => process.exit(0), 250).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', error => logger.error({ error }, 'Unhandled rejection'))
process.on('uncaughtException', error => { logger.fatal({ error }, 'Uncaught exception'); shutdown('uncaughtException') })

await client.login(config.DISCORD_TOKEN)
