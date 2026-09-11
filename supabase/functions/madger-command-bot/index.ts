import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  LINKS, OFFICIAL_MINT, OFFICIAL_POOL, buyTier, escapeHtml,
  marketAlertReasons, moderationEscalation, moderationReason,
  normalizeReferral, normalizedMessageFingerprint
} from './core.js'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const BOT_USERNAME = Deno.env.get('TELEGRAM_BOT_USERNAME') ?? ''
const ADMIN_IDS = new Set((Deno.env.get('TELEGRAM_ADMIN_CHAT_IDS') ?? '').split(',').map(v => v.trim()).filter(Boolean))
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHANNEL_ID') ?? [...ADMIN_IDS][0] ?? ''
const BUY_CHAT_ID = Deno.env.get('TELEGRAM_BUY_ALERT_CHAT_ID') ?? ADMIN_CHAT_ID
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
const SERVICE_KEY = SECRET_KEYS.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com'
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : ''
const JOIN_VERIFY_MINUTES = 10
const FLOOD_WINDOW_SECONDS = 15
const FLOOD_MESSAGE_LIMIT = 7
const DUPLICATE_WINDOW_SECONDS = 60
const DUPLICATE_MESSAGE_LIMIT = 3
const MUTE_MINUTES = 10
const adminCache = new Map()

const dbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
}

async function db(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...dbHeaders, ...(init.headers ?? {}) }
  })
  if (!response.ok) throw new Error(`database request failed: ${response.status} ${await response.text()}`)
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function insert(table, body, prefer = 'return=minimal') {
  return db(table, { method: 'POST', headers: { Prefer: prefer }, body: JSON.stringify(body) })
}

async function telegram(method, body) {
  if (!API) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  const response = await fetch(`${API}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  const result = await response.json()
  if (!result.ok) throw new Error(`Telegram ${method} failed: ${result.description ?? response.status}`)
  return result.result
}

function keyboard(rows) {
  return { inline_keyboard: rows }
}

function trackedUrl(route, referralCode = '') {
  const ref = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''
  return `${SUPABASE_URL}/functions/v1/madger-command-bot/go/${route}${ref}`
}

async function send(chatId, text, replyMarkup, extra = {}) {
  return telegram('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}), ...extra
  })
}

async function deleteQuietly(chatId, messageId) {
  try { await telegram('deleteMessage', { chat_id: chatId, message_id: messageId }) } catch { /* already deleted or insufficient rights */ }
}

function isGroupChat(chat) {
  return chat?.type === 'group' || chat?.type === 'supergroup'
}

async function isChatAdmin(chatId, userId) {
  if (ADMIN_IDS.has(String(userId))) return true
  const key = `${chatId}:${userId}`
  const cached = adminCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.value
  try {
    const member = await telegram('getChatMember', { chat_id: chatId, user_id: userId })
    const value = member.status === 'creator' || member.status === 'administrator'
    adminCache.set(key, { value, expires: Date.now() + 300000 })
    return value
  } catch {
    return false
  }
}

async function restrictMember(chatId, userId, untilDate = 0) {
  return telegram('restrictChatMember', {
    chat_id: chatId, user_id: userId, until_date: untilDate,
    use_independent_chat_permissions: true,
    permissions: {
      can_send_messages: false, can_send_audios: false, can_send_documents: false,
      can_send_photos: false, can_send_videos: false, can_send_video_notes: false,
      can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false,
      can_add_web_page_previews: false
    }
  })
}

async function restoreMember(chatId, userId) {
  return telegram('restrictChatMember', {
    chat_id: chatId, user_id: userId,
    use_independent_chat_permissions: true,
    permissions: {
      can_send_messages: true, can_send_audios: true, can_send_documents: true,
      can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
      can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
      can_add_web_page_previews: true
    }
  })
}

async function removeMember(chatId, userId) {
  await telegram('banChatMember', { chat_id: chatId, user_id: userId, revoke_messages: true })
  await telegram('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true })
}

async function moderationState(chatId, userId) {
  const rows = await db(`madger_bot_moderation_state?chat_id=eq.${encodeURIComponent(chatId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  return rows?.[0] ?? null
}

async function saveModerationState(body) {
  await db('madger_bot_moderation_state?on_conflict=chat_id,user_id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() })
  })
}

function conversionKeyboard(referralCode = '') {
  return keyboard([
    [{ text: '🧭 New to crypto: Start Here', url: trackedUrl('guide', referralCode) }],
    [{ text: '⚡ Open Raydium', url: trackedUrl('raydium', referralCode) }, { text: '📈 Live Chart', url: trackedUrl('dex', referralCode) }],
    [{ text: '🤖 BONKbot', url: trackedUrl('bonkbot', referralCode) }, { text: '⚔️ Trojan', url: trackedUrl('trojan', referralCode) }],
    [{ text: '✅ Verify MADGER', url: LINKS.verify }, { text: '🦡 Join The Burrow', url: LINKS.community }],
    [{ text: '🎯 Contributor Missions', callback_data: 'missions' }]
  ])
}

async function recordEvent(eventType, chatId, metadata = {}, referralCode = null) {
  await insert('madger_bot_events', { event_type: eventType, chat_id: chatId, metadata, referral_code: referralCode })
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function authenticateInternal(request) {
  const supplied = request.headers.get('x-madger-monitor-secret') ?? ''
  if (!supplied) return false
  const rows = await db('madger_bot_settings?key=eq.monitor_secret_sha256&select=value&limit=1')
  const expectedHash = String(rows?.[0]?.value ?? '')
  return expectedHash.length === 64 && await sha256Hex(supplied) === expectedHash
}

async function registerUser(user, sourceRef) {
  const chatId = String(user.id)
  const existing = await db(`madger_bot_users?chat_id=eq.${encodeURIComponent(chatId)}&select=chat_id,source_ref&limit=1`)
  const isNew = !existing?.length
  await db('madger_bot_users?on_conflict=chat_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      chat_id: user.id,
      username: user.username ?? null,
      display_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      ...(isNew && sourceRef ? { source_ref: sourceRef } : {}),
      last_seen_at: new Date().toISOString()
    })
  })
  if (isNew && sourceRef) {
    await db('rpc/madger_bot_increment_referral', {
      method: 'POST', body: JSON.stringify({ p_code: sourceRef })
    })
  }
  return isNew
}

async function referralJoinCount(code) {
  const rows = await db(`madger_bot_referrals?code=eq.${encodeURIComponent(code)}&select=joins&limit=1`)
  return Number(rows?.[0]?.joins ?? 0)
}

async function referralCodeFor(chatId) {
  const current = await db(`madger_bot_referrals?owner_chat_id=eq.${encodeURIComponent(chatId)}&select=code&limit=1`)
  if (current?.[0]?.code) return current[0].code
  const bytes = new TextEncoder().encode(`madger:${chatId}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const code = `m${[...digest].slice(0, 5).map(value => value.toString(16).padStart(2, '0')).join('')}`
  await insert('madger_bot_referrals', { code, owner_chat_id: Number(chatId) })
  return code
}

async function showWelcome(chatId, user, ref) {
  await send(chatId,
    `<b>MADGER COMMAND CENTER</b> 🦡\n\nVerify first. Then move. Use the complete official mint every time:\n<code>${OFFICIAL_MINT}</code>\n\nChoose your route below. Administrators never request seed phrases, private keys, recovery codes, verification transfers, or remote wallet access.`,
    conversionKeyboard(ref)
  )
  await recordEvent('welcome', Number(chatId), { username: user.username ?? null }, ref)
}

async function welcomeNewMembers(message) {
  if (!isGroupChat(message.chat)) return
  for (const user of message.new_chat_members ?? []) {
    if (!user?.id) continue
    await registerUser(user, null)
    if (user.is_bot) {
      if (ADMIN_CHAT_ID) await send(ADMIN_CHAT_ID, `<b>Bot added to The Burrow</b>\n@${escapeHtml(user.username ?? 'unknown')} · <code>${user.id}</code>\nReview whether it is still required.`)
      continue
    }
    if (await isChatAdmin(message.chat.id, user.id)) continue
    let restricted = true
    try { await restrictMember(message.chat.id, user.id) } catch { restricted = false }
    const deadline = new Date(Date.now() + JOIN_VERIFY_MINUTES * 60000).toISOString()
    const name = escapeHtml(user.first_name || user.username || 'new member')
    const welcome = await send(message.chat.id,
      `<b>Welcome to The Burrow, ${name}.</b> 🦡\n\nTap below within ${JOIN_VERIFY_MINUTES} minutes to unlock chat access.\n\nNever send anyone your seed phrase, private key, recovery code, or a “verification” payment. Official admins will not DM first.`,
      keyboard([[{ text: '✅ I’m human — enter The Burrow', callback_data: `verify_join:${message.chat.id}:${user.id}` }]])
    )
    await saveModerationState({
      chat_id: message.chat.id, user_id: user.id, pending_verification: restricted,
      verification_deadline: restricted ? deadline : null, welcome_message_id: welcome.message_id
    })
    await recordEvent('join_challenge', user.id, { chat_id: message.chat.id, restricted })
  }
  await deleteQuietly(message.chat.id, message.message_id)
}

async function verifyNewMember(callback) {
  const [, chatValue, userValue] = String(callback.data ?? '').split(':')
  const chatId = Number(chatValue)
  const userId = Number(userValue)
  if (!Number.isSafeInteger(chatId) || !Number.isSafeInteger(userId)) return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'Invalid verification request.', show_alert: true })
  if (callback.from.id !== userId) return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'This verification button belongs to the new member.', show_alert: true })
  const state = await moderationState(chatId, userId)
  if (!state?.pending_verification) return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'You are already verified.' })
  await restoreMember(chatId, userId)
  await saveModerationState({ chat_id: chatId, user_id: userId, pending_verification: false, verification_deadline: null })
  await telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'Verified. Welcome to The Burrow!' })
  try {
    await telegram('editMessageText', {
      chat_id: chatId, message_id: callback.message.message_id, parse_mode: 'HTML',
      text: `<b>${escapeHtml(callback.from.first_name || callback.from.username || 'Member')} verified.</b> Welcome to The Burrow. 🦡\n\nUse /buy for official purchase routes and /safety before trusting any link.`
    })
  } catch { /* welcome may have been removed by an admin */ }
  await recordEvent('join_verified', userId, { chat_id: chatId })
}

async function sweepExpiredJoins() {
  const cutoff = encodeURIComponent(new Date().toISOString())
  const rows = await db(`madger_bot_moderation_state?pending_verification=eq.true&verification_deadline=lte.${cutoff}&select=chat_id,user_id,welcome_message_id&limit=100`)
  for (const row of rows ?? []) {
    try { await removeMember(row.chat_id, row.user_id) } catch { /* permissions may have changed */ }
    if (row.welcome_message_id) await deleteQuietly(row.chat_id, row.welcome_message_id)
    await saveModerationState({ chat_id: row.chat_id, user_id: row.user_id, pending_verification: false, verification_deadline: null, removed_at: new Date().toISOString() })
    await recordEvent('join_expired', row.user_id, { chat_id: row.chat_id })
  }
}

async function showSafety(chatId) {
  return send(chatId, `<b>MADGER SAFETY STANDARD</b> 🛡️\n\n• Official mint: <code>${OFFICIAL_MINT}</code>\n• Verify links through madgercoin.com\n• Admins never DM first\n• Never share seed phrases, private keys, recovery codes, or screen access\n• Never send a “verification” transfer\n• Reply to suspicious content with /report`)
}

async function showRules(chatId) {
  return send(chatId, '<b>THE BURROW RULES</b>\n\n1. No scams, fake contracts, impersonation, or unsolicited wallet links.\n2. No flooding, repeated promotions, or coordinated harassment.\n3. Debate ideas without threatening or targeting members.\n4. Promotions require administrator approval.\n5. Use /report as a reply when something needs review.\n\nEnforcement: warning → temporary mute → removal. Credential theft attempts may be removed immediately.')
}

async function showMissions(chatId) {
  const missions = await db('madger_bot_missions?active=eq.true&select=code,title,instructions,points&order=points.desc&limit=10')
  if (!missions?.length) return send(chatId, 'No missions are active right now. Quality beats filler.')
  const lines = missions.map(m => `<b>${escapeHtml(m.title)}</b> · ${m.points} points\n<code>${escapeHtml(m.code)}</code> — ${escapeHtml(m.instructions)}`)
  await send(chatId, `<b>ACTIVE CONTRIBUTOR MISSIONS</b> 🎯\n\n${lines.join('\n\n')}\n\nSubmit evidence with:\n<code>/submit mission-code https://your-public-link</code>`)
  await recordEvent('missions_viewed', Number(chatId))
}

async function submitMission(chatId, args) {
  const [missionCode, evidence] = args.trim().split(/\s+/, 2)
  let parsed
  try { parsed = new URL(evidence) } catch { parsed = null }
  if (!missionCode || !parsed || parsed.protocol !== 'https:') {
    return send(chatId, 'Use: <code>/submit mission-code https://your-public-evidence-link</code>')
  }
  const mission = await db(`madger_bot_missions?code=eq.${encodeURIComponent(missionCode)}&active=eq.true&select=code&limit=1`)
  if (!mission?.length) return send(chatId, 'That mission is not active. Use /missions to see the current list.')
  try {
    const created = await insert('madger_bot_submissions?select=id', { mission_code: missionCode, user_chat_id: Number(chatId), evidence_url: parsed.href }, 'return=representation')
    await send(chatId, 'Submitted for human review. Points are awarded only after the work is verified.')
    await recordEvent('mission_submitted', Number(chatId), { mission_code: missionCode })
    if (ADMIN_CHAT_ID) await send(ADMIN_CHAT_ID, `<b>New mission submission</b>\nID: <code>${created?.[0]?.id ?? 'unknown'}</code>\nMission: <code>${escapeHtml(missionCode)}</code>\nContributor: <code>${chatId}</code>\n<a href="${escapeHtml(parsed.href)}">Review evidence</a>`)
  } catch (error) {
    if (String(error).includes('duplicate')) return send(chatId, 'That exact evidence was already submitted.')
    throw error
  }
}

async function showRank(chatId) {
  const users = await db(`madger_bot_users?chat_id=eq.${encodeURIComponent(chatId)}&select=points&limit=1`)
  const points = Number(users?.[0]?.points ?? 0)
  const rank = points >= 1000 ? 'Burrow Elite' : points >= 500 ? 'Verified Creator' : points >= 250 ? 'Claw Contributor' : points >= 100 ? 'Scout' : 'Burrow Member'
  await send(chatId, `<b>${rank}</b>\n${points} verified contribution points\n\nPoints measure approved work—not purchases, hype, or blind engagement.`)
}

async function showReferral(chatId) {
  const code = await referralCodeFor(chatId)
  const joins = await referralJoinCount(code)
  let username = BOT_USERNAME
  if (!username && BOT_TOKEN) username = (await telegram('getMe', {})).username ?? ''
  if (!username) return send(chatId, `Your referral code is <code>${code}</code>. The shareable bot link becomes available when the bot username is configured.`)
  await send(chatId, `<b>Your verified referral route</b>\n<code>https://t.me/${escapeHtml(username)}?start=ref_${code}</code>\n\nRecorded new members: ${joins}\nRewards require real participation or approved work; raw clicks and purchases do not earn points.`)
}

async function adminStats(chatId) {
  if (!ADMIN_IDS.has(String(chatId))) return send(chatId, 'Admin command denied.')
  const since = encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())
  const [users, submissions, events, snapshots] = await Promise.all([
    db('madger_bot_users?select=chat_id'),
    db('madger_bot_submissions?status=eq.pending&select=id'),
    db(`madger_bot_events?created_at=gte.${since}&select=event_type`),
    db('madger_bot_market_snapshots?select=price_usd,liquidity_usd,created_at&order=created_at.desc&limit=1')
  ])
  const counts = (events ?? []).reduce((map, event) => ({ ...map, [event.event_type]: (map[event.event_type] ?? 0) + 1 }), {})
  const market = snapshots?.[0]
  await send(chatId, `<b>MADGER BOT — 7 DAY COMMAND REPORT</b>\n\nMembers tracked: ${users?.length ?? 0}\nPending submissions: ${submissions?.length ?? 0}\nWelcome sessions: ${counts.welcome ?? 0}\nMission views: ${counts.missions_viewed ?? 0}\nSubmissions: ${counts.mission_submitted ?? 0}\nReferral link opens: ${counts.referral_open ?? 0}\n\nLatest market snapshot:\nPrice: ${market?.price_usd ?? 'unavailable'} USD\nLiquidity: ${market?.liquidity_usd ?? 'unavailable'} USD`)
}

async function reviewSubmission(chatId, args, status) {
  if (!ADMIN_IDS.has(String(chatId))) return send(chatId, 'Admin command denied.')
  const [idValue, ...noteParts] = args.trim().split(/\s+/)
  const id = Number(idValue)
  if (!Number.isSafeInteger(id) || id <= 0) return send(chatId, `Use: <code>/${status === 'approved' ? 'approve' : 'reject'} submission-id optional-note</code>`)
  const result = await db('rpc/madger_bot_review_submission', {
    method: 'POST', body: JSON.stringify({ p_submission_id: id, p_status: status, p_reviewer_chat_id: Number(chatId), p_note: noteParts.join(' ') || null })
  })
  const reviewed = result?.[0]
  await send(chatId, `Submission ${id} ${status}.${status === 'approved' ? ` Awarded ${reviewed?.awarded_points ?? 0} points.` : ''}`)
  if (reviewed?.user_chat_id) await send(reviewed.user_chat_id, `Your mission submission ${id} was ${status}.${status === 'approved' ? ` +${reviewed.awarded_points} verified points.` : ''}`)
}

async function reportMessage(message) {
  const target = message.reply_to_message
  if (!target?.from) return send(message.chat.id, 'Reply directly to the suspicious message with <code>/report</code>.')
  await recordEvent('member_report', message.from.id, {
    chat_id: message.chat.id, reported_user_id: target.from.id,
    reported_message_id: target.message_id, reporter_username: message.from.username ?? null
  })
  if (ADMIN_CHAT_ID) {
    const excerpt = escapeHtml(String(target.text ?? target.caption ?? '[media]').slice(0, 500))
    await send(ADMIN_CHAT_ID, `<b>Member report</b> 🚨\nChat: <code>${message.chat.id}</code>\nReported user: <code>${target.from.id}</code> @${escapeHtml(target.from.username ?? 'none')}\nReporter: <code>${message.from.id}</code>\nMessage ID: <code>${target.message_id}</code>\n\n<blockquote>${excerpt}</blockquote>`)
  }
  return send(message.chat.id, 'Report recorded for administrator review. Do not engage with the suspicious account.')
}

async function adminModerationAction(message, command, args) {
  if (!ADMIN_IDS.has(String(message.from.id)) && !await isChatAdmin(message.chat.id, message.from.id)) return send(message.chat.id, 'Admin command denied.')
  const target = message.reply_to_message?.from
  if (!target) return send(message.chat.id, `Reply to a member's message with <code>/${command}${command === 'mute' ? ' 10' : ''}</code>.`)
  if (await isChatAdmin(message.chat.id, target.id)) return send(message.chat.id, 'MADGERbot will not moderate an administrator.')
  if (command === 'warn') {
    const state = await moderationState(message.chat.id, target.id)
    const count = Number(state?.warning_count ?? 0) + 1
    await saveModerationState({ chat_id: message.chat.id, user_id: target.id, warning_count: count })
    return send(message.chat.id, `@${escapeHtml(target.username ?? target.first_name ?? String(target.id))} received an administrator warning (${count}).`)
  }
  if (command === 'mute') {
    const minutes = Math.min(1440, Math.max(1, Number.parseInt(args, 10) || MUTE_MINUTES))
    const until = Math.floor(Date.now() / 1000) + minutes * 60
    await restrictMember(message.chat.id, target.id, until)
    await saveModerationState({ chat_id: message.chat.id, user_id: target.id, restricted_until: new Date(until * 1000).toISOString() })
    return send(message.chat.id, `Member muted for ${minutes} minute${minutes === 1 ? '' : 's'}.`)
  }
  if (command === 'ban') {
    await telegram('banChatMember', { chat_id: message.chat.id, user_id: target.id, revoke_messages: true })
    await saveModerationState({ chat_id: message.chat.id, user_id: target.id, removed_at: new Date().toISOString() })
    return send(message.chat.id, 'Member banned and recent messages removed.')
  }
}

async function handleCommand(message) {
  const chatId = message.chat.id
  const raw = message.text?.trim() ?? ''
  const [commandWithBot, ...rest] = raw.split(/\s+/)
  const command = commandWithBot.toLowerCase().split('@')[0]
  const args = rest.join(' ')
  const startRef = command === '/start' ? normalizeReferral(args) : null
  await registerUser(message.from, startRef)

  if (command === '/start') return showWelcome(chatId, message.from, startRef)
  if (command === '/buy') return send(chatId, `<b>BUY $MADGER SAFELY</b>\n\nOfficial mint:\n<code>${OFFICIAL_MINT}</code>\n\nMADGER never presets your amount or slippage. Review every wallet prompt before approving.`, conversionKeyboard())
  if (command === '/mint' || command === '/verify') return send(chatId, `<b>OFFICIAL MADGER MINT</b>\n<code>${OFFICIAL_MINT}</code>\n\nPool:\n<code>${OFFICIAL_POOL}</code>`, keyboard([[{ text: 'Open canonical verification', url: LINKS.verify }]]))
  if (command === '/missions') return showMissions(chatId)
  if (command === '/submit') return submitMission(chatId, args)
  if (command === '/rank') return showRank(chatId)
  if (command === '/referral') return showReferral(chatId)
  if (command === '/rules') return showRules(chatId)
  if (command === '/safety') return showSafety(chatId)
  if (command === '/report') return reportMessage(message)
  if (command === '/whoami') return send(chatId, `Your Telegram user ID is <code>${message.from.id}</code>. Treat admin IDs as operational configuration, not public content.`)
  if (command === '/chatid') return send(chatId, `This chat ID is <code>${message.chat.id}</code>. Use it only in the bot's secure runtime configuration.`)
  if (command === '/stats') return adminStats(chatId)
  if (command === '/approve') return reviewSubmission(chatId, args, 'approved')
  if (command === '/reject') return reviewSubmission(chatId, args, 'rejected')
  if (command === '/warn') return adminModerationAction(message, 'warn', args)
  if (command === '/mute') return adminModerationAction(message, 'mute', args)
  if (command === '/ban') return adminModerationAction(message, 'ban', args)
  return send(chatId, 'Commands: /buy · /verify · /missions · /submit · /rank · /referral · /rules · /safety · /report')
}

async function moderate(message) {
  const text = message.text ?? message.caption ?? ''
  if (!text || !message.from || message.from.is_bot || !isGroupChat(message.chat)) return false
  if (await isChatAdmin(message.chat.id, message.from.id)) return false

  const now = Date.now()
  const state = await moderationState(message.chat.id, message.from.id)
  const fingerprint = normalizedMessageFingerprint(text)
  const hash = fingerprint ? await sha256Hex(fingerprint) : ''
  const floodStarted = state?.flood_window_started_at ? Date.parse(state.flood_window_started_at) : 0
  const inFloodWindow = now - floodStarted <= FLOOD_WINDOW_SECONDS * 1000
  const floodCount = inFloodWindow ? Number(state?.flood_count ?? 0) + 1 : 1
  const duplicateStarted = state?.duplicate_window_started_at ? Date.parse(state.duplicate_window_started_at) : 0
  const sameDuplicateWindow = Boolean(hash && state?.duplicate_hash === hash && now - duplicateStarted <= DUPLICATE_WINDOW_SECONDS * 1000)
  const duplicateCount = sameDuplicateWindow ? Number(state?.duplicate_count ?? 0) + 1 : 1
  const reason = moderationReason(text)
    ?? (floodCount >= FLOOD_MESSAGE_LIMIT ? 'message flooding' : null)
    ?? (fingerprint.length >= 8 && duplicateCount >= DUPLICATE_MESSAGE_LIMIT ? 'repeated-message spam' : null)

  await saveModerationState({
    chat_id: message.chat.id, user_id: message.from.id,
    flood_count: floodCount, flood_window_started_at: inFloodWindow ? state.flood_window_started_at : new Date(now).toISOString(),
    duplicate_hash: hash || null, duplicate_count: duplicateCount,
    duplicate_window_started_at: sameDuplicateWindow ? state.duplicate_window_started_at : new Date(now).toISOString()
  })
  if (!reason) return false

  await deleteQuietly(message.chat.id, message.message_id)
  const credentialAttack = reason === 'wallet credential solicitation' || reason === 'admin/support impersonation'
  const warningCount = Number(state?.warning_count ?? 0) + (credentialAttack ? 3 : 1)
  const action = moderationEscalation(warningCount)
  let publicAction = 'Message removed and warning recorded.'
  if (action === 'mute') {
    const until = Math.floor(Date.now() / 1000) + MUTE_MINUTES * 60
    await restrictMember(message.chat.id, message.from.id, until)
    await saveModerationState({ chat_id: message.chat.id, user_id: message.from.id, warning_count: warningCount, restricted_until: new Date(until * 1000).toISOString() })
    publicAction = `Message removed. Member muted for ${MUTE_MINUTES} minutes.`
  } else if (action === 'remove') {
    await removeMember(message.chat.id, message.from.id)
    await saveModerationState({ chat_id: message.chat.id, user_id: message.from.id, warning_count: warningCount, removed_at: new Date().toISOString() })
    publicAction = 'Message removed. Account removed from The Burrow.'
  } else {
    await saveModerationState({ chat_id: message.chat.id, user_id: message.from.id, warning_count: warningCount })
  }
  await send(message.chat.id, `<b>MADGER Guard:</b> ${escapeHtml(reason)}. ${publicAction}\nUse /safety for the official protection standard.`)
  await recordEvent('moderation_action', message.from.id, { chat_id: message.chat.id, reason, action, warning_count: warningCount })
  if (ADMIN_CHAT_ID) await send(ADMIN_CHAT_ID, `<b>MADGER Guard action</b> 🛡️\nChat: <code>${message.chat.id}</code>\nUser: <code>${message.from.id}</code> @${escapeHtml(message.from.username ?? 'none')}\nReason: ${escapeHtml(reason)}\nAction: ${escapeHtml(action)}\nMessage ID: <code>${message.message_id}</code>`)
  return true
}

async function handleUpdate(update) {
  try {
    await insert('madger_bot_processed_updates', { update_id: update.update_id })
  } catch (error) {
    if (String(error).includes('duplicate')) return
    throw error
  }

  if (update.callback_query) {
    if (String(update.callback_query.data ?? '').startsWith('verify_join:')) return verifyNewMember(update.callback_query)
    await telegram('answerCallbackQuery', { callback_query_id: update.callback_query.id })
    if (update.callback_query.data === 'missions') await showMissions(update.callback_query.message.chat.id)
    return
  }
  const message = update.message ?? update.channel_post
  if (!message) return
  if (message.new_chat_members?.length) return welcomeNewMembers(message)
  if (await moderate(message)) return
  if (message.text?.startsWith('/') && message.from) await handleCommand(message)
  else if (message.from) await registerUser(message.from, null)
}

async function routeRedirect(request, url) {
  const route = url.pathname.split('/').filter(Boolean).at(-1)
  const target = LINKS[route]
  if (!target) return new Response('Unknown route', { status: 404 })
  const ref = normalizeReferral(url.searchParams.get('ref'))
  await recordEvent('referral_open', null, { route }, ref)
  return Response.redirect(target, 302)
}

async function monitorMarket(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  await sweepExpiredJoins()
  const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${OFFICIAL_POOL}`)
  if (!response.ok) throw new Error(`DEX Screener request failed: ${response.status}`)
  const payload = await response.json()
  const pair = payload.pair ?? payload.pairs?.find(item => item.pairAddress === OFFICIAL_POOL)
  const pairHasMint = pair && (pair.baseToken?.address === OFFICIAL_MINT || pair.quoteToken?.address === OFFICIAL_MINT)
  if (!pairHasMint || String(pair.pairAddress).toLowerCase() !== OFFICIAL_POOL.toLowerCase()) throw new Error('Official MADGER pair was not returned')
  const cutoff = encodeURIComponent(new Date(Date.now() - 15 * 60000).toISOString())
  const previousRows = await db(`madger_bot_market_snapshots?created_at=lte.${cutoff}&select=price_usd,liquidity_usd,created_at&order=created_at.desc&limit=1`)
  const reasons = marketAlertReasons(pair, previousRows?.[0])
  await insert('madger_bot_market_snapshots', {
    price_usd: pair.priceUsd ?? null,
    liquidity_usd: pair.liquidity?.usd ?? null,
    volume_m5_usd: pair.volume?.m5 ?? null,
    buys_m5: pair.txns?.m5?.buys ?? null,
    sells_m5: pair.txns?.m5?.sells ?? null,
    raw: pair
  })
  if (reasons.length && ADMIN_CHAT_ID) await send(ADMIN_CHAT_ID, `<b>MADGER MARKET ALERT</b> ⚠️\n\n${reasons.map(escapeHtml).join('\n')}\n\nPrice: $${escapeHtml(pair.priceUsd)}\nLiquidity: $${escapeHtml(pair.liquidity?.usd)}\n<a href="${LINKS.dex}">Inspect verified pair</a>`)
  return Response.json({ ok: true, alerts: reasons.length })
}

async function verifyBuyAlert(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  const body = await request.json()
  const signature = String(body.signature ?? '')
  const buyer = String(body.buyer ?? '')
  if (!signature || !buyer) return new Response('Missing signature or buyer', { status: 400 })
  const rpc = await fetch(RPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }] })
  }).then(response => response.json())
  const transaction = rpc.result
  if (!transaction || transaction.meta?.err) return new Response('Transaction not confirmed', { status: 422 })
  const pre = transaction.meta.preTokenBalances ?? []
  const post = transaction.meta.postTokenBalances ?? []
  const amount = post.filter(item => item.mint === OFFICIAL_MINT && item.owner === buyer).reduce((sum, item) => sum + Number(item.uiTokenAmount?.uiAmountString ?? 0), 0)
    - pre.filter(item => item.mint === OFFICIAL_MINT && item.owner === buyer).reduce((sum, item) => sum + Number(item.uiTokenAmount?.uiAmountString ?? 0), 0)
  if (!(amount > 0)) return new Response('No verified MADGER increase for buyer', { status: 422 })
  const latest = await db('madger_bot_market_snapshots?select=price_usd&order=created_at.desc&limit=1')
  const usdValue = amount * Number(latest?.[0]?.price_usd ?? 0)
  const tier = buyTier(usdValue)
  try {
    await insert('madger_bot_alerts', { alert_type: 'verified_buy', transaction_signature: signature, buyer_wallet: buyer, token_amount: amount, usd_value: usdValue, metadata: { source: body.source ?? 'webhook' } })
  } catch (error) {
    if (String(error).includes('duplicate')) return Response.json({ ok: true, duplicate: true })
    throw error
  }
  if (tier.instant && BUY_CHAT_ID) {
    await send(BUY_CHAT_ID, `${tier.emoji} <b>${tier.label}</b>\n\n${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} MADGER\nApprox. $${usdValue.toFixed(2)}\n\n<a href="https://solscan.io/tx/${encodeURIComponent(signature)}">Verified on Solana</a>`, conversionKeyboard())
  }
  return Response.json({ ok: true, verified: true, tier: tier.label, instant: tier.instant })
}

async function setupTelegram(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  if (!BOT_TOKEN || !WEBHOOK_SECRET) return Response.json({ ok: false, error: 'telegram_secrets_missing' }, { status: 409 })
  const bot = await telegram('getMe', {})
  await telegram('setWebhook', {
    url: `${SUPABASE_URL}/functions/v1/madger-command-bot`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'channel_post', 'callback_query', 'my_chat_member'],
    drop_pending_updates: false
  })
  await telegram('setMyCommands', { commands: [
    { command: 'buy', description: 'Open verified MADGER purchase routes' },
    { command: 'verify', description: 'Verify the official mint and pool' },
    { command: 'missions', description: 'View active contributor missions' },
    { command: 'submit', description: 'Submit mission evidence' },
    { command: 'rank', description: 'View contribution points and rank' },
    { command: 'referral', description: 'Create your attributable invite link' },
    { command: 'rules', description: 'Read The Burrow community rules' },
    { command: 'safety', description: 'Read the official wallet safety standard' },
    { command: 'report', description: 'Reply to suspicious content to report it' },
    { command: 'whoami', description: 'Display your numeric Telegram ID' },
    { command: 'chatid', description: 'Display the current chat ID' }
  ] })
  let guard = { configured: false, can_delete_messages: false, can_restrict_members: false }
  if (BUY_CHAT_ID) {
    try {
      const membership = await telegram('getChatMember', { chat_id: BUY_CHAT_ID, user_id: bot.id })
      guard = {
        configured: membership.status === 'administrator' || membership.status === 'creator',
        can_delete_messages: Boolean(membership.can_delete_messages),
        can_restrict_members: Boolean(membership.can_restrict_members)
      }
    } catch { /* group may not be configured yet */ }
  }
  return Response.json({ ok: true, username: bot.username, webhook: 'registered', commands: 'registered', guard })
}

Deno.serve(async request => {
  try {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname.includes('/go/')) return routeRedirect(request, url)
    if (request.method === 'GET') {
      return Response.json({ ok: true, service: 'MADGER Command Bot', version: '2.0.0', configured: Boolean(BOT_TOKEN && WEBHOOK_SECRET), community_guard: true })
    }
    if (url.pathname.endsWith('/setup')) return setupTelegram(request)
    if (url.pathname.endsWith('/monitor')) return monitorMarket(request)
    if (url.pathname.endsWith('/buy-alert')) return verifyBuyAlert(request)
    if (request.headers.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET || !WEBHOOK_SECRET) return new Response('Unauthorized', { status: 401 })
    await handleUpdate(await request.json())
    return Response.json({ ok: true })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
})
