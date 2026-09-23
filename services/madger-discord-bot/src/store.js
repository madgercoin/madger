import { createClient } from '@supabase/supabase-js'

function unwrap(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  return result.data
}

export function createStore(config) {
  const db = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'madger-discord-bot/1.0.0' } }
  })

  return Object.freeze({
    async health() {
      const started = Date.now()
      const result = await db.from('madger_bot_settings').select('key').limit(1)
      unwrap(result, 'database health check')
      return { ok: true, latencyMs: Date.now() - started }
    },

    async recordEvent(event) {
      return unwrap(await db.from('madger_discord_events').insert({
        guild_id: event.guildId,
        user_id: event.userId ?? null,
        channel_id: event.channelId ?? null,
        message_id: event.messageId ?? null,
        event_type: event.type,
        severity: event.severity ?? 'info',
        details: event.details ?? {}
      }).select().single(), 'record Discord event')
    },

    async upsertMember({ guildId, userId, username, joinedAt }) {
      return unwrap(await db.from('madger_discord_members').upsert({
        guild_id: guildId,
        user_id: userId,
        username: username ?? null,
        joined_at: joinedAt ?? null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'guild_id,user_id' }).select().single(), 'upsert Discord member')
    },

    async addXp({ guildId, userId, username, amount }) {
      const { data: current, error } = await db.from('madger_discord_members')
        .select('xp,message_count,last_xp_at').eq('guild_id', guildId).eq('user_id', userId).maybeSingle()
      if (error) throw new Error(`read member XP: ${error.message}`)
      const now = Date.now()
      const last = current?.last_xp_at ? Date.parse(current.last_xp_at) : 0
      const eligible = now - last >= 60_000
      const xp = Number(current?.xp ?? 0) + (eligible ? amount : 0)
      const result = await db.from('madger_discord_members').upsert({
        guild_id: guildId, user_id: userId, username,
        xp, message_count: Number(current?.message_count ?? 0) + 1,
        last_xp_at: eligible ? new Date(now).toISOString() : current?.last_xp_at ?? null,
        updated_at: new Date(now).toISOString()
      }, { onConflict: 'guild_id,user_id' }).select().single()
      return { ...unwrap(result, 'update member XP'), gained: eligible ? amount : 0 }
    },

    async member(guildId, userId) {
      return unwrap(await db.from('madger_discord_members').select('*').eq('guild_id', guildId).eq('user_id', userId).maybeSingle(), 'read Discord member')
    },

    async incrementWarning({ guildId, userId, username }) {
      const { data: current, error } = await db.from('madger_discord_members')
        .select('warning_count').eq('guild_id', guildId).eq('user_id', userId).maybeSingle()
      if (error) throw new Error(`read warning count: ${error.message}`)
      return unwrap(await db.from('madger_discord_members').upsert({
        guild_id: guildId,
        user_id: userId,
        username: username ?? null,
        warning_count: Number(current?.warning_count ?? 0) + 1,
        updated_at: new Date().toISOString()
      }, { onConflict: 'guild_id,user_id' }).select().single(), 'increment warning count')
    },

    async leaderboard(guildId, limit = 10) {
      return unwrap(await db.from('madger_discord_members').select('user_id,username,xp,contribution_points,message_count')
        .eq('guild_id', guildId).order('contribution_points', { ascending: false }).order('xp', { ascending: false }).limit(limit), 'read Discord leaderboard')
    },

    async activeMissions() {
      return unwrap(await db.from('madger_bot_missions').select('code,title,instructions,points').eq('active', true).order('points', { ascending: false }), 'read active missions')
    },

    async activeMission(code) {
      return unwrap(await db.from('madger_bot_missions').select('code').eq('code', code).eq('active', true).maybeSingle(), 'read active mission')
    },

    async createSubmission({ guildId, userId, missionCode, evidenceUrl }) {
      return unwrap(await db.from('madger_discord_submissions').insert({
        guild_id: guildId, user_id: userId, mission_code: missionCode, evidence_url: evidenceUrl
      }).select().single(), 'create Discord submission')
    },

    async pendingSubmissions(guildId, limit = 10) {
      return unwrap(await db.from('madger_discord_submissions').select('*').eq('guild_id', guildId).eq('status', 'pending').order('created_at').limit(limit), 'read pending Discord submissions')
    },

    async reviewSubmission({ id, status, reviewerUserId, note }) {
      return unwrap(await db.rpc('madger_discord_review_submission', {
        p_submission_id: id, p_status: status, p_reviewer_user_id: reviewerUserId, p_note: note ?? null
      }), 'review Discord submission')
    },

    async createTicket({ guildId, channelId, ownerUserId, topic }) {
      return unwrap(await db.from('madger_discord_tickets').insert({
        guild_id: guildId, channel_id: channelId, owner_user_id: ownerUserId, topic
      }).select().single(), 'create Discord ticket')
    },

    async closeTicket(channelId, closedBy) {
      return unwrap(await db.from('madger_discord_tickets').update({
        status: 'closed', closed_at: new Date().toISOString(), closed_by: closedBy
      }).eq('channel_id', channelId).eq('status', 'open').select().maybeSingle(), 'close Discord ticket')
    },

    async ticket(channelId) {
      return unwrap(await db.from('madger_discord_tickets').select('*').eq('channel_id', channelId).maybeSingle(), 'read Discord ticket')
    },

    async latestMarket() {
      return unwrap(await db.from('madger_bot_market_snapshots').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(), 'read latest market snapshot')
    },

    async latestHolders() {
      return unwrap(await db.from('madger_bot_holder_snapshots').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(), 'read latest holder snapshot')
    },

    async setSetting(guildId, key, value) {
      return unwrap(await db.from('madger_discord_settings').upsert({ guild_id: guildId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'guild_id,key' }).select().single(), 'set Discord setting')
    },

    async getSetting(guildId, key) {
      const row = unwrap(await db.from('madger_discord_settings').select('value').eq('guild_id', guildId).eq('key', key).maybeSingle(), 'read Discord setting')
      return row?.value ?? null
    }
  })
}
