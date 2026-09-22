import { z } from 'zod'

const optionalSnowflake = z.string().regex(/^\d{16,22}$/).optional().or(z.literal(''))
const bool = z.enum(['true', 'false']).default('true').transform(value => value === 'true')

const schema = z.object({
  DISCORD_TOKEN: z.string().min(30),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{16,22}$/),
  DISCORD_GUILD_ID: z.string().regex(/^\d{16,22}$/),
  SUPABASE_URL: z.string().url().startsWith('https://'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30),
  DISCORD_ADMIN_USER_IDS: z.string().default(''),
  DISCORD_MOD_LOG_CHANNEL_ID: optionalSnowflake,
  DISCORD_ALERT_CHANNEL_ID: optionalSnowflake,
  DISCORD_WELCOME_CHANNEL_ID: optionalSnowflake,
  DISCORD_VERIFIED_ROLE_ID: optionalSnowflake,
  DISCORD_QUARANTINE_ROLE_ID: optionalSnowflake,
  DISCORD_ANNOUNCEMENT_CHANNEL_ID: optionalSnowflake,
  DISCORD_SUPPORT_CATEGORY_ID: optionalSnowflake,
  DISCORD_STARBOARD_CHANNEL_ID: optionalSnowflake,
  DISCORD_MEMBER_ROLE_ID: optionalSnowflake,
  DISCORD_CONTRIBUTOR_ROLE_ID: optionalSnowflake,
  FEATURE_LEVELING: bool,
  FEATURE_TICKETS: bool,
  FEATURE_STARBOARD: bool,
  FEATURE_WELCOME: bool,
  FEATURE_MARKET_ALERTS: bool,
  FEATURE_AUTOMOD_SYNC: bool,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
})

export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const details = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Invalid MADGER Discord configuration: ${details}`)
  }

  return Object.freeze({
    ...parsed.data,
    adminUserIds: new Set(parsed.data.DISCORD_ADMIN_USER_IDS.split(',').map(value => value.trim()).filter(Boolean))
  })
}
