import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  LINKS, OFFICIAL_MINT, OFFICIAL_POOL, buyTier, compactWallet, contributorRank, escapeHtml, faqIntent,
  findVerifiedMadgerBuyers, holderSnapshotFromAccounts,
  marketAlertReasons, marketSnapshotSummary, moderationEscalation, moderationReason, poolSnapshotSummary,
  normalizeMissionCode, normalizeReferral, normalizeTeam, normalizedMessageFingerprint,
  parseAnnouncement, parseMissionDefinition, parseRaidMode, parseReviewRequest, parseTeamAlert, pendingSignatures,
  shouldActivateRaidMode, significantHolderMovements
} from './core.js'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const BOT_USERNAME = Deno.env.get('TELEGRAM_BOT_USERNAME') ?? ''
const ADMIN_IDS = new Set((Deno.env.get('TELEGRAM_ADMIN_CHAT_IDS') ?? '').split(',').map(v => v.trim()).filter(Boolean))
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHANNEL_ID') ?? [...ADMIN_IDS][0] ?? ''
const BUY_CHAT_ID = Deno.env.get('TELEGRAM_BUY_ALERT_CHAT_ID') ?? ADMIN_CHAT_ID
const BUY_ALERT_MEDIA_URL = Deno.env.get('TELEGRAM_BUY_ALERT_MEDIA_URL') ?? LINKS.buyCard
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
const SERVICE_KEY = SECRET_KEYS.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com'
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : ''
const JOIN_VERIFY_MINUTES = 10
const RAID_VERIFY_MINUTES = 3
const RAID_MODE_MINUTES = 30
const RAID_JOIN_WINDOW_SECONDS = 60
const RAID_JOIN_THRESHOLD = 8
const FAQ_COOLDOWN_SECONDS = 180
const FLOOD_WINDOW_SECONDS = 15
const FLOOD_MESSAGE_LIMIT = 7
const DUPLICATE_WINDOW_SECONDS = 60
const DUPLICATE_MESSAGE_LIMIT = 3
const MUTE_MINUTES = 10
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
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

async function setting(key) {
  const rows = await db(`madger_bot_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`)
  return rows?.[0]?.value ?? null
}

async function saveSetting(key, value) {
  await db('madger_bot_settings?on_conflict=key', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
  })
}

async function solanaRpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })
  if (!response.ok) throw new Error(`Solana RPC ${method} failed: ${response.status}`)
  const payload = await response.json()
  if (payload.error) throw new Error(`Solana RPC ${method} failed: ${payload.error.message ?? 'unknown error'}`)
  return payload.result
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

async function scheduleCleanup(chatId, messageId, reason, minutes = 5) {
  await db('madger_bot_message_cleanup?on_conflict=chat_id,message_id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      chat_id: chatId, message_id: messageId, reason,
      delete_after: new Date(Date.now() + minutes * 60000).toISOString()
    })
  })
}

async function sweepMessageCleanup() {
  const cutoff = encodeURIComponent(new Date().toISOString())
  const rows = await db(`madger_bot_message_cleanup?deleted_at=is.null&delete_after=lte.${cutoff}&select=chat_id,message_id&limit=100`)
  for (const row of rows ?? []) {
    await deleteQuietly(row.chat_id, row.message_id)
    await db(`madger_bot_message_cleanup?chat_id=eq.${row.chat_id}&message_id=eq.${row.message_id}`, {
      method: 'PATCH', body: JSON.stringify({ deleted_at: new Date().toISOString() })
    })
  }
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

function buyAlertKeyboard(signature = '') {
  const firstRow = signature
    ? [{ text: '🔎 View Transaction', url: `https://solscan.io/tx/${encodeURIComponent(signature)}` }, { text: '📈 Live Chart', url: LINKS.dex }]
    : [{ text: '📈 Live Chart', url: LINKS.dex }]
  return keyboard([
    firstRow,
    [{ text: '⚡ Buy MADGER', url: trackedUrl('raydium') }, { text: '✅ Verify Mint', url: LINKS.verify }]
  ])
}

async function sendBuyCard(chatId, caption, signature = '') {
  try {
    const message = await telegram('sendPhoto', {
      chat_id: chatId, photo: BUY_ALERT_MEDIA_URL, caption, parse_mode: 'HTML',
      reply_markup: buyAlertKeyboard(signature)
    })
    return { message, deliveryMethod: 'photo' }
  } catch (mediaError) {
    console.error('MADGER buy-card media delivery failed; using text fallback', mediaError)
    const message = await send(chatId, caption, buyAlertKeyboard(signature))
    return { message, deliveryMethod: 'text_fallback' }
  }
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

function raidModeKey(chatId) {
  return `raid_mode_${chatId}`
}

async function raidModeForChat(chatId) {
  return parseRaidMode(await setting(raidModeKey(chatId)))
}

async function activateRaidMode(chatId, minutes, source) {
  const until = new Date(Date.now() + minutes * 60000).toISOString()
  await saveSetting(raidModeKey(chatId), { until, source, activated_at: new Date().toISOString() })
  const shortenedDeadline = new Date(Date.now() + RAID_VERIFY_MINUTES * 60000).toISOString()
  await db(`madger_bot_moderation_state?chat_id=eq.${encodeURIComponent(chatId)}&pending_verification=eq.true&verification_deadline=gt.${encodeURIComponent(shortenedDeadline)}`, {
    method: 'PATCH', body: JSON.stringify({ verification_deadline: shortenedDeadline, updated_at: new Date().toISOString() })
  })
  await recordEvent('raid_mode_activated', null, { chat_id: chatId, minutes, source })
  return { active: true, until, source }
}

async function maybeActivateRaidMode(chatId, incomingJoins) {
  const current = await raidModeForChat(chatId)
  if (current.active) return current
  const cutoff = encodeURIComponent(new Date(Date.now() - RAID_JOIN_WINDOW_SECONDS * 1000).toISOString())
  const recent = await db(`madger_bot_events?event_type=eq.join_challenge&created_at=gte.${cutoff}&select=metadata&limit=100`)
  const recentInChat = (recent ?? []).filter(row => String(row.metadata?.chat_id) === String(chatId)).length
  if (!shouldActivateRaidMode(recentInChat, incomingJoins, RAID_JOIN_THRESHOLD)) return current
  const activated = await activateRaidMode(chatId, RAID_MODE_MINUTES, 'automatic_join_burst')
  if (ADMIN_CHAT_ID) await send(ADMIN_CHAT_ID, `<b>MADGER RAID SHIELD ACTIVATED</b> 🚨\n\nDetected ${recentInChat + incomingJoins} joins within ${RAID_JOIN_WINDOW_SECONDS} seconds. New-member verification is reduced to ${RAID_VERIFY_MINUTES} minutes until ${escapeHtml(activated.until)}.\n\nUse /raidmode status or /raidmode off in this private chat.`)
  return activated
}

async function welcomeNewMembers(message) {
  if (!isGroupChat(message.chat)) return
  const incomingHumans = (message.new_chat_members ?? []).filter(user => user?.id && !user.is_bot).length
  const raidMode = await maybeActivateRaidMode(message.chat.id, incomingHumans)
  const verifyMinutes = raidMode.active ? RAID_VERIFY_MINUTES : JOIN_VERIFY_MINUTES
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
    const deadline = new Date(Date.now() + verifyMinutes * 60000).toISOString()
    const name = escapeHtml(user.first_name || user.username || 'new member')
    const welcome = await send(message.chat.id,
      `<b>Welcome to The Burrow, ${name}.</b> 🦡\n\nTap below within ${verifyMinutes} minutes to unlock chat access.${raidMode.active ? '\n\n🚨 Raid Shield is active. Unverified accounts are removed quickly.' : ''}\n\nNever send anyone your seed phrase, private key, recovery code, or a “verification” payment. Official admins will not DM first.`,
      keyboard([[{ text: '✅ I’m human — enter The Burrow', callback_data: `verify_join:${message.chat.id}:${user.id}` }]])
    )
    await saveModerationState({
      chat_id: message.chat.id, user_id: user.id, pending_verification: restricted,
      verification_deadline: restricted ? deadline : null, welcome_message_id: welcome.message_id
    })
    await recordEvent('join_challenge', user.id, { chat_id: message.chat.id, restricted, raid_mode: raidMode.active })
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
    await scheduleCleanup(chatId, callback.message.message_id, 'verified_welcome', 5)
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

function compactUsd(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) return 'unavailable'
  if (value > 0 && value < 0.01) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 10 })}`
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`
}

async function showMarket(chatId) {
  const rows = await db('madger_bot_market_snapshots?select=price_usd,liquidity_usd,volume_m5_usd,buys_m5,sells_m5,raw,created_at&order=created_at.desc&limit=1')
  if (!rows?.length) return send(chatId, 'Market data is temporarily unavailable. Use the verified chart link below.', keyboard([[{ text: '📈 Open verified chart', url: LINKS.dex }]]))
  const market = marketSnapshotSummary(rows[0])
  return send(chatId, `<b>MADGER MARKET SNAPSHOT</b> 📊\n\nPrice: ${compactUsd(market.priceUsd)}\nMarket cap: ${compactUsd(market.marketCapUsd, 0)}\nLiquidity: ${compactUsd(market.liquidityUsd, 0)}\n5m volume: ${compactUsd(market.volumeM5Usd)}\n5m trades: ${market.buysM5 ?? '—'} buys · ${market.sellsM5 ?? '—'} sells\nUpdated: ${market.ageMinutes === null ? 'unknown' : `${market.ageMinutes} minute${market.ageMinutes === 1 ? '' : 's'} ago`}\n\nAlways verify the mint before trading.`, keyboard([[{ text: '📈 Live verified chart', url: LINKS.dex }, { text: '⚡ Open Raydium', url: LINKS.raydium }]]))
}

async function marketSnapshots() {
  const cutoff = encodeURIComponent(new Date(Date.now() - 24 * 3600000).toISOString())
  return Promise.all([
    db('madger_bot_market_snapshots?select=price_usd,liquidity_usd,volume_m5_usd,buys_m5,sells_m5,raw,created_at&order=created_at.desc&limit=1'),
    db(`madger_bot_market_snapshots?created_at=lte.${cutoff}&select=liquidity_usd,created_at&order=created_at.desc&limit=1`)
  ])
}

function signedPercentage(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}%` : 'building baseline'
}

async function showPool(chatId) {
  const [latestRows, priorRows] = await marketSnapshots()
  if (!latestRows?.length) return send(chatId, 'Pool intelligence is temporarily unavailable.', keyboard([[{ text: '📈 Open verified pool', url: LINKS.dex }]]))
  const pool = poolSnapshotSummary(latestRows[0], priorRows?.[0])
  return send(chatId, `<b>MADGER OFFICIAL POOL</b> 🌊

DEX: <b>${escapeHtml(pool.dexId || 'Raydium')}</b> · ${escapeHtml(pool.poolLabel || 'CPMM')}
Liquidity: <b>${compactUsd(pool.liquidityUsd, 0)}</b>
24h liquidity change: <b>${signedPercentage(pool.liquidityChangePercentage)}</b>
Liquidity / market cap: <b>${pool.liquidityToMarketCapPercentage === null ? 'unavailable' : `${pool.liquidityToMarketCapPercentage.toFixed(2)}%`}</b>
24h volume: <b>${compactUsd(pool.volumeH24Usd)}</b>
24h trades: <b>${pool.buysH24 ?? '—'} buys · ${pool.sellsH24 ?? '—'} sells</b>
24h price move: <b>${signedPercentage(pool.priceChangeH24Percentage)}</b>
Pool age: <b>${pool.pairAgeDays === null ? 'unknown' : `${pool.pairAgeDays} days`}</b>
Updated: ${pool.ageMinutes === null ? 'unknown' : `${pool.ageMinutes} minute${pool.ageMinutes === 1 ? '' : 's'} ago`}

This report verifies the configured pool; it is not a guarantee of liquidity or future price.`, keyboard([
    [{ text: '📈 Inspect verified pool', url: LINKS.dex }, { text: '⚡ Open Raydium', url: LINKS.raydium }],
    [{ text: '✅ Verify Mint', url: LINKS.verify }]
  ]))
}

async function showRisk(chatId) {
  const [[marketRows, priorMarketRows], [holderRows]] = await Promise.all([marketSnapshots(), holderSnapshots()])
  const market = marketRows?.[0]
  const holders = holderRows?.[0]
  if (!market || !holders) return send(chatId, 'Risk intelligence is still building its verified market and holder baseline.')
  const pool = poolSnapshotSummary(market, priorMarketRows?.[0])
  const holderAge = Math.max(0, Math.floor((Date.now() - Date.parse(holders.created_at)) / 60000))
  return send(chatId, `<b>MADGER RISK SNAPSHOT</b> 🛡️

Official mint: <b>verified ✅</b>
Official Raydium pool: <b>verified ✅</b>
Market data age: <b>${pool.ageMinutes ?? 'unknown'}m</b>
Holder data age: <b>${holderAge}m</b>

Liquidity: <b>${compactUsd(pool.liquidityUsd, 0)}</b>
Liquidity / market cap: <b>${pool.liquidityToMarketCapPercentage === null ? 'unavailable' : `${pool.liquidityToMarketCapPercentage.toFixed(2)}%`}</b>
24h liquidity change: <b>${signedPercentage(pool.liquidityChangePercentage)}</b>
Positive-balance wallets: <b>${Number(holders.holder_count).toLocaleString('en-US')}</b>
Largest wallet: <b>${Number(holders.largest_percentage).toFixed(2)}%</b>
Top 10 concentration: <b>${Number(holders.top_10_percentage).toFixed(2)}%</b>

Concentration is raw on-chain ownership. Treasury, liquidity, locked, exchange, and custodial wallets may be included. This is a factual monitor—not a safety rating or financial advice.`, keyboard([
    [{ text: '🌊 Pool details', url: LINKS.raydium }, { text: '🔎 Token accounts', url: LINKS.solscanToken }],
    [{ text: '📈 Verified chart', url: LINKS.dex }]
  ]))
}

async function showOfficialLinks(chatId) {
  return send(chatId, `<b>OFFICIAL MADGER LINKS</b> ✅\n\nWebsite: ${LINKS.home}\nOfficial mint:\n<code>${OFFICIAL_MINT}</code>\n\nTreat any conflicting contract, support account, or wallet link as suspicious.`, keyboard([
    [{ text: '🌐 Official website', url: LINKS.home }, { text: '🦡 The Burrow', url: LINKS.community }],
    [{ text: '✅ Verify MADGER', url: LINKS.verify }, { text: '📈 Verified chart', url: LINKS.dex }]
  ]))
}

async function holderSnapshots() {
  const cutoff = encodeURIComponent(new Date(Date.now() - 24 * 3600000).toISOString())
  return Promise.all([
    db('madger_bot_holder_snapshots?select=*&order=created_at.desc&limit=1'),
    db(`madger_bot_holder_snapshots?created_at=lte.${cutoff}&select=*&order=created_at.desc&limit=1`)
  ])
}

async function showHolders(chatId) {
  const [latestRows, priorRows] = await holderSnapshots()
  const latest = latestRows?.[0]
  if (!latest) return send(chatId, 'Holder intelligence is initializing. Try again after the next 15-minute snapshot.', keyboard([[{ text: '🔎 Inspect official token', url: LINKS.solscanToken }]]))
  const prior = priorRows?.[0]
  const change = prior ? Number(latest.holder_count) - Number(prior.holder_count) : null
  const age = Math.max(0, Math.floor((Date.now() - Date.parse(latest.created_at)) / 60000))
  return send(chatId, `<b>MADGER HOLDER INTELLIGENCE</b> 🛰️

Positive-balance wallets: <b>${Number(latest.holder_count).toLocaleString('en-US')}</b>
24h wallet change: <b>${change === null ? 'building baseline' : `${change >= 0 ? '+' : ''}${change}`}</b>
Largest wallet: <b>${Number(latest.largest_percentage).toFixed(2)}%</b> of supply
Top 10 concentration: <b>${Number(latest.top_10_percentage).toFixed(2)}%</b>
Updated: ${age} minute${age === 1 ? '' : 's'} ago

Wallet counts represent positive on-chain owners—not verified people. Treasury, liquidity, exchange, and custodial wallets may be included.`, keyboard([
    [{ text: '🔎 Inspect official token', url: LINKS.solscanToken }, { text: '📈 Live Chart', url: LINKS.dex }],
    [{ text: '✅ Verify Mint', url: LINKS.verify }]
  ]))
}

async function showHolderIntel(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Detailed holder intelligence is private. Use /holderintel in your direct MADGERbot chat.')
  }
  const [latestRows, priorRows] = await holderSnapshots()
  const latest = latestRows?.[0]
  if (!latest) return send(message.chat.id, 'Holder intelligence has not completed its first snapshot.')
  const prior = priorRows?.[0]
  const owners = latest.raw?.owners ?? []
  const lines = owners.slice(0, 10).map((item, index) =>
    `${index + 1}. <code>${escapeHtml(compactWallet(item.owner))}</code> · ${Number(item.percentage).toFixed(2)}% · ${Number(item.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  )
  const change = prior ? Number(latest.holder_count) - Number(prior.holder_count) : null
  return send(message.chat.id, `<b>MADGER HOLDER CONSOLE</b> 🔬

Positive-balance wallets: ${latest.holder_count}
24h change: ${change === null ? 'building baseline' : `${change >= 0 ? '+' : ''}${change}`}
Token accounts scanned: ${latest.token_account_count}
Top 10 concentration: ${Number(latest.top_10_percentage).toFixed(2)}%

<b>Largest on-chain owners</b>
${lines.join('\n')}

Movement alerts identify balance changes only. They never label a transfer as a buy or sell.`, keyboard([[{ text: 'Inspect token accounts', url: LINKS.solscanToken }]]))
}

async function showHelp(chatId) {
  return send(chatId, '<b>MADGERBOT COMMANDS</b> 🦡\n\n<b>Market intelligence</b>\n/buy · /price · /pool · /risk · /holders · /chart · /ca · /verify · /links\n\n<b>Community</b>\n/rules · /safety · /report · /teams\n\n<b>Contribute</b>\n/missions · /submit · /mywork · /rank · /leaderboard · /referral\n\nMADGERbot never requests wallet credentials, payments, verification transfers, or remote access.')
}

async function faqResponderEnabled() {
  return await setting('faq_responder_enabled') !== false
}

async function manageFaqMode(message, args) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'FAQ controls are private. Use /faqmode here in your direct MADGERbot chat.')
  }
  const action = args.trim().toLowerCase() || 'status'
  if (action === 'on' || action === 'off') {
    const enabled = action === 'on'
    await saveSetting('faq_responder_enabled', enabled)
    await recordEvent('faq_mode_changed', message.from.id, { enabled })
    return send(message.chat.id, `<b>MADGER FAQ responder:</b> ${enabled ? 'ON' : 'OFF'}.`)
  }
  if (action !== 'status') return send(message.chat.id, 'Use <code>/faqmode status</code>, <code>/faqmode on</code>, or <code>/faqmode off</code>.')
  return send(message.chat.id, `<b>MADGER FAQ responder:</b> ${await faqResponderEnabled() ? 'ON' : 'OFF'}\nPer-topic group cooldown: ${FAQ_COOLDOWN_SECONDS / 60} minutes.`)
}

async function maybeAnswerFaq(message) {
  if (!isGroupChat(message.chat) || !message.from || message.from.is_bot) return false
  const intent = faqIntent(message.text ?? message.caption ?? '')
  if (!intent || !await faqResponderEnabled()) return false
  const cooldownKey = `faq_last_${message.chat.id}_${intent}`
  const lastAnswer = Date.parse(String(await setting(cooldownKey) ?? ''))
  if (Number.isFinite(lastAnswer) && Date.now() - lastAnswer < FAQ_COOLDOWN_SECONDS * 1000) return false
  await saveSetting(cooldownKey, new Date().toISOString())

  let posted
  if (intent === 'price') posted = await showMarket(message.chat.id)
  else if (intent === 'pool') posted = await showPool(message.chat.id)
  else if (intent === 'risk') posted = await showRisk(message.chat.id)
  else if (intent === 'contract') posted = await send(message.chat.id, `<b>OFFICIAL MADGER MINT</b> ✅\n<code>${OFFICIAL_MINT}</code>\n\nVerify the complete address—never a shortened match.`, keyboard([[{ text: 'Canonical verification', url: LINKS.verify }]]))
  else if (intent === 'buy') posted = await send(message.chat.id, '<b>BUY $MADGER SAFELY</b> ⚡\nUse a verified route and choose your own amount and slippage. MADGERbot never asks for funds or wallet credentials.', keyboard([[{ text: '🧭 Beginner guide', url: LINKS.guide }, { text: '⚡ Open Raydium', url: LINKS.raydium }]]))
  else posted = await showOfficialLinks(message.chat.id)
  if (posted?.message_id) await scheduleCleanup(message.chat.id, posted.message_id, `faq_${intent}`, 4)
  await recordEvent('faq_answered', message.from.id, { chat_id: message.chat.id, intent })
  return true
}

async function chatSecurityInfo(chatId) {
  try {
    const chat = await telegram('getChat', { chat_id: chatId })
    return {
      aggressiveAntiSpam: chat.has_aggressive_anti_spam_enabled === true,
      slowModeSeconds: Number(chat.slow_mode_delay ?? 0)
    }
  } catch {
    return { aggressiveAntiSpam: null, slowModeSeconds: null }
  }
}

async function manageRaidMode(message, args) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Raid Shield controls are private. Use /raidmode here in your direct MADGERbot chat.')
  }
  if (!BUY_CHAT_ID) return send(message.chat.id, 'The Burrow destination is not configured.')
  const [action = 'status', minutesValue = ''] = args.trim().toLowerCase().split(/\s+/)
  if (action === 'off') {
    await saveSetting(raidModeKey(BUY_CHAT_ID), { until: null, source: 'manual', disabled_at: new Date().toISOString() })
    await recordEvent('raid_mode_disabled', message.from.id, { chat_id: BUY_CHAT_ID })
    return send(message.chat.id, '<b>MADGER Raid Shield:</b> automatic emergency mode is off. Standard join verification remains active.')
  }
  if (action === 'on') {
    const requested = minutesValue ? Number(minutesValue) : RAID_MODE_MINUTES
    if (!Number.isInteger(requested) || requested < 5 || requested > 180) return send(message.chat.id, 'Use <code>/raidmode on 30</code>. Duration must be 5–180 minutes.')
    const activated = await activateRaidMode(BUY_CHAT_ID, requested, 'manual')
    return send(message.chat.id, `<b>MADGER Raid Shield activated.</b> 🚨\nNew members have ${RAID_VERIFY_MINUTES} minutes to verify.\nEnds: ${escapeHtml(activated.until)}`)
  }
  if (action !== 'status') return send(message.chat.id, 'Use <code>/raidmode status</code>, <code>/raidmode on 30</code>, or <code>/raidmode off</code>.')
  const current = await raidModeForChat(BUY_CHAT_ID)
  return send(message.chat.id, `<b>MADGER Raid Shield</b>\nStatus: ${current.active ? 'ACTIVE 🚨' : 'normal'}${current.active ? `\nEnds: ${escapeHtml(current.until)}\nSource: ${escapeHtml(current.source ?? 'unknown')}` : `\nAutomatic trigger: ${RAID_JOIN_THRESHOLD} joins in ${RAID_JOIN_WINDOW_SECONDS} seconds`}`)
}

async function purgeUnverified(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Unverified-member controls are private. Use /purgeunverified here in your direct MADGERbot chat.')
  }
  if (!BUY_CHAT_ID) return send(message.chat.id, 'The Burrow destination is not configured.')
  const rows = await db(`madger_bot_moderation_state?chat_id=eq.${encodeURIComponent(BUY_CHAT_ID)}&pending_verification=eq.true&select=chat_id,user_id,welcome_message_id&order=verification_deadline.asc&limit=25`)
  let removed = 0
  let failed = 0
  for (const row of rows ?? []) {
    try {
      await removeMember(row.chat_id, row.user_id)
      if (row.welcome_message_id) await deleteQuietly(row.chat_id, row.welcome_message_id)
      await saveModerationState({ chat_id: row.chat_id, user_id: row.user_id, pending_verification: false, verification_deadline: null, removed_at: new Date().toISOString() })
      await recordEvent('join_purged', row.user_id, { chat_id: row.chat_id, admin_id: message.from.id })
      removed += 1
    } catch { failed += 1 }
  }
  return send(message.chat.id, `<b>Unverified-member purge complete.</b>\nRemoved: ${removed}\nFailed: ${failed}${rows?.length === 25 ? '\nRun /purgeunverified again if more remain.' : ''}`)
}

async function showSafety(chatId) {
  return send(chatId, `<b>MADGER SAFETY STANDARD</b> 🛡️\n\n• Official mint: <code>${OFFICIAL_MINT}</code>\n• Verify links through madgercoin.com\n• Admins never DM first\n• Never share seed phrases, private keys, recovery codes, or screen access\n• Never send a “verification” transfer\n• Reply to suspicious content with /report`)
}

async function showRules(chatId) {
  return send(chatId, '<b>THE BURROW RULES</b>\n\n1. No scams, fake contracts, impersonation, or unsolicited wallet links.\n2. No flooding, repeated promotions, or coordinated harassment.\n3. Debate ideas without threatening or targeting members.\n4. Promotions require administrator approval.\n5. Use /report as a reply when something needs review.\n\nEnforcement: warning → temporary mute → removal. Credential theft attempts may be removed immediately.')
}

function teamLabel(team) {
  return team === 'raid' ? 'Raid Team' : 'Outreach Team'
}

function teamCenterKeyboard() {
  return keyboard([
    [{ text: '⚡ Join Raid Team', callback_data: 'team_join:raid' }, { text: '📣 Join Outreach Team', callback_data: 'team_join:outreach' }],
    [{ text: 'Leave Raid Team', callback_data: 'team_leave:raid' }, { text: 'Leave Outreach Team', callback_data: 'team_leave:outreach' }]
  ])
}

async function showTeams(message) {
  if (message.chat.type !== 'private') {
    const username = BOT_USERNAME || (await telegram('getMe', {})).username
    return send(message.chat.id, '<b>MADGER PROMOTION TEAMS</b>\n\nParticipation is voluntary. Open the private team center to join without exposing the member list.',
      keyboard([[{ text: 'Open private team center', url: `https://t.me/${escapeHtml(username)}?start=teams` }]]))
  }
  const memberships = await db(`madger_bot_team_memberships?user_chat_id=eq.${encodeURIComponent(message.from.id)}&active=eq.true&select=team`)
  const joined = new Set((memberships ?? []).map(row => row.team))
  return send(message.chat.id,
    `<b>MADGER PROMOTION TEAMS</b>\n\n⚡ Raid Team: ${joined.has('raid') ? 'JOINED' : 'not joined'}\nApproved MADGER posts; authentic, original engagement only.\n\n📣 Outreach Team: ${joined.has('outreach') ? 'JOINED' : 'not joined'}\nRelevant community opportunities; disclose your connection and never spam.\n\nNo scripts, copy-paste swarms, fake claims, harassment, or financial promises.`,
    teamCenterKeyboard())
}

async function setTeamMembership(callback) {
  const [actionValue, teamValue] = String(callback.data ?? '').split(':')
  const team = normalizeTeam(teamValue)
  const active = actionValue === 'team_join'
  if (!team || (actionValue !== 'team_join' && actionValue !== 'team_leave')) {
    return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'Invalid team request.', show_alert: true })
  }
  if (callback.message.chat.type !== 'private') {
    return telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'Open the private bot chat to manage teams.', show_alert: true })
  }
  await registerUser(callback.from, null)
  await db('madger_bot_team_memberships?on_conflict=user_chat_id,team', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_chat_id: callback.from.id, team, active, updated_at: new Date().toISOString() })
  })
  await telegram('answerCallbackQuery', { callback_query_id: callback.id, text: `${active ? 'Joined' : 'Left'} ${teamLabel(team)}.` })
  await recordEvent(active ? 'team_joined' : 'team_left', callback.from.id, { team })
  return showTeams({ chat: callback.message.chat, from: callback.from })
}

async function setTeamFromCommand(message, args, active) {
  if (message.chat.type !== 'private') return showTeams(message)
  const team = normalizeTeam(args)
  if (!team) return send(message.chat.id, `Use: <code>/${active ? 'jointeam' : 'leaveteam'} raid</code> or <code>/${active ? 'jointeam' : 'leaveteam'} outreach</code>`)
  await db('madger_bot_team_memberships?on_conflict=user_chat_id,team', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_chat_id: message.from.id, team, active, updated_at: new Date().toISOString() })
  })
  await recordEvent(active ? 'team_joined' : 'team_left', message.from.id, { team })
  return send(message.chat.id, `${active ? 'Joined' : 'Left'} <b>${teamLabel(team)}</b>. ${active ? 'You will receive private, administrator-approved alerts and can leave at any time.' : 'Alerts for this team are now off.'}`)
}

async function teamStats(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Team statistics are private. Use /teamstats here in your direct MADGERbot chat.')
  }
  const memberships = await db('madger_bot_team_memberships?active=eq.true&select=team')
  const counts = (memberships ?? []).reduce((result, row) => ({ ...result, [row.team]: (result[row.team] ?? 0) + 1 }), {})
  return send(message.chat.id, `<b>MADGER TEAM STATUS</b>\n\nRaid Team: ${counts.raid ?? 0}\nOutreach Team: ${counts.outreach ?? 0}`)
}

async function launchTeamAlert(message, args) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') return send(message.chat.id, 'Launch team alerts only in your private chat with MADGERbot.')
  const alert = parseTeamAlert(args)
  if (!alert) return send(message.chat.id, 'Use: <code>/teamalert raid https://x.com/... | Write an original comment about the artwork.</code>\n\nAllowed targets: MADGER, X, Telegram, Instagram, Facebook, TikTok, Reddit, or YouTube HTTPS links.')
  const cooldown = encodeURIComponent(new Date(Date.now() - 30 * 60000).toISOString())
  const recent = await db(`madger_bot_team_alerts?team=eq.${alert.team}&created_at=gte.${cooldown}&select=id&limit=1`)
  if (recent?.length) return send(message.chat.id, `${teamLabel(alert.team)} has already received an alert within the last 30 minutes.`)

  const created = await insert('madger_bot_team_alerts?select=id', {
    team: alert.team, target_url: alert.url, brief: alert.brief, created_by: message.from.id
  }, 'return=representation')
  const members = await db(`madger_bot_team_memberships?team=eq.${alert.team}&active=eq.true&select=user_chat_id&limit=500`)
  let delivered = 0
  let failed = 0
  for (let index = 0; index < (members ?? []).length; index += 25) {
    const batch = members.slice(index, index + 25)
    const results = await Promise.all(batch.map(async member => {
      try {
        await send(member.user_chat_id,
          `<b>MADGER ${alert.team === 'raid' ? 'RAID' : 'OUTREACH'} TEAM ALERT</b> ${alert.team === 'raid' ? '⚡' : '📣'}\n\n${escapeHtml(alert.brief)}\n\nUse your own words. Participate only if genuine. No copy-paste spam, harassment, misleading claims, or financial promises.`,
          keyboard([[{ text: 'Open approved target', url: alert.url }], [{ text: 'Manage team alerts', callback_data: `team_leave:${alert.team}` }]]))
        return true
      } catch { return false }
    }))
    delivered += results.filter(Boolean).length
    failed += results.filter(result => !result).length
    if (index + 25 < members.length) await new Promise(resolve => setTimeout(resolve, 1000))
  }
  await db(`madger_bot_team_alerts?id=eq.${created?.[0]?.id}`, {
    method: 'PATCH', body: JSON.stringify({ recipient_count: delivered, failure_count: failed })
  })
  await recordEvent('team_alert', message.from.id, { team: alert.team, alert_id: created?.[0]?.id, delivered, failed })
  return send(message.chat.id, `<b>${teamLabel(alert.team)} alert complete.</b>\nDelivered: ${delivered}\nFailed/blocked: ${failed}`)
}

async function publishAnnouncement(message, args, pinRequested) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') return send(message.chat.id, 'Publish official announcements only from your private MADGERbot chat.')
  if (!BUY_CHAT_ID) return send(message.chat.id, 'The Burrow destination is not configured.')
  const announcement = parseAnnouncement(args)
  if (!announcement) return send(message.chat.id, `Use: <code>/${pinRequested ? 'announcepin' : 'announce'} Message text | https://trusted-link | Button label</code>\n\nThe link and button are optional. Messages must contain 5–1,000 characters.`)
  const replyMarkup = announcement.url ? keyboard([[{ text: announcement.label, url: announcement.url }]]) : undefined
  const posted = await send(BUY_CHAT_ID, `<b>MADGER OFFICIAL</b> 📣\n\n${escapeHtml(announcement.text)}`, replyMarkup)
  let pinned = false
  let pinFailure = ''
  if (pinRequested) {
    try {
      await telegram('pinChatMessage', { chat_id: BUY_CHAT_ID, message_id: posted.message_id, disable_notification: false })
      pinned = true
    } catch (error) {
      pinFailure = ' The announcement posted, but Telegram denied pinning; grant MADGERbot permission to pin messages.'
    }
  }
  await insert('madger_bot_announcements', {
    chat_id: Number(BUY_CHAT_ID), message_id: posted.message_id, body: announcement.text,
    target_url: announcement.url, button_label: announcement.label, pinned, created_by: message.from.id
  })
  await recordEvent('announcement', message.from.id, { chat_id: BUY_CHAT_ID, message_id: posted.message_id, pinned })
  return send(message.chat.id, `<b>Announcement published.</b>\nMessage ID: <code>${posted.message_id}</code>\nPinned: ${pinned ? 'yes' : 'no'}.${pinFailure}`)
}

async function adminDashboard(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'The command dashboard is private. Use /dashboard here in your direct MADGERbot chat.')
  }
  const since = encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())
  const [users, pendingJoins, events, memberships, alerts, announcements, snapshots, activeMissions, pendingSubmissions, raidMode, chatSecurity, faqEnabled] = await Promise.all([
    db('madger_bot_users?select=chat_id'),
    db('madger_bot_moderation_state?pending_verification=eq.true&select=user_id'),
    db(`madger_bot_events?created_at=gte.${since}&select=event_type`),
    db('madger_bot_team_memberships?active=eq.true&select=team'),
    db('madger_bot_team_alerts?select=recipient_count,failure_count&order=created_at.desc&limit=20'),
    db('madger_bot_announcements?select=id&order=created_at.desc&limit=20'),
    db('madger_bot_market_snapshots?select=price_usd,liquidity_usd&order=created_at.desc&limit=1'),
    db('madger_bot_missions?active=eq.true&select=code'),
    db('madger_bot_submissions?status=eq.pending&select=id'),
    raidModeForChat(BUY_CHAT_ID),
    chatSecurityInfo(BUY_CHAT_ID),
    faqResponderEnabled()
  ])
  const eventCounts = (events ?? []).reduce((result, row) => ({ ...result, [row.event_type]: (result[row.event_type] ?? 0) + 1 }), {})
  const teamCounts = (memberships ?? []).reduce((result, row) => ({ ...result, [row.team]: (result[row.team] ?? 0) + 1 }), {})
  const delivered = (alerts ?? []).reduce((sum, row) => sum + Number(row.recipient_count ?? 0), 0)
  const failed = (alerts ?? []).reduce((sum, row) => sum + Number(row.failure_count ?? 0), 0)
  const market = snapshots?.[0]
  return send(message.chat.id, `<b>MADGER COMMAND DASHBOARD</b> 🦡\n\n<b>Community</b>\nRaid Shield: ${raidMode.active ? 'ACTIVE 🚨' : 'normal'}\nRaid link firewall: ${raidMode.active ? 'locked' : 'standby'}\nFAQ responder: ${faqEnabled ? 'on' : 'off'} · ${eventCounts.faq_answered ?? 0} answers (7d)\nTelegram native anti-spam: ${chatSecurity.aggressiveAntiSpam === null ? 'unknown' : chatSecurity.aggressiveAntiSpam ? 'enabled' : 'disabled'}\nTelegram slow mode: ${chatSecurity.slowModeSeconds === null ? 'unknown' : `${chatSecurity.slowModeSeconds}s`}\nTracked members: ${users?.length ?? 0}\nPending join checks: ${pendingJoins?.length ?? 0}\nVerified joins (7d): ${eventCounts.join_verified ?? 0}\nExpired/purged joins (7d): ${(eventCounts.join_expired ?? 0) + (eventCounts.join_purged ?? 0)}\nModeration actions (7d): ${eventCounts.moderation_action ?? 0}\nMember reports (7d): ${eventCounts.member_report ?? 0}\n\n<b>Contributor program</b>\nActive missions: ${activeMissions?.length ?? 0}\nPending reviews: ${pendingSubmissions?.length ?? 0}\nLeaderboard views (7d): ${eventCounts.leaderboard_viewed ?? 0}\n\n<b>Promotion teams</b>\nRaid: ${teamCounts.raid ?? 0}\nOutreach: ${teamCounts.outreach ?? 0}\nRecent deliveries: ${delivered}\nDelivery failures: ${failed}\n\n<b>Publishing</b>\nRecent announcements: ${announcements?.length ?? 0}\n\n<b>Market</b>\nPrice: ${market?.price_usd ?? 'unavailable'} USD\nLiquidity: ${market?.liquidity_usd ?? 'unavailable'} USD`)
}

async function showMissions(chatId, ephemeral = false) {
  const missions = await db('madger_bot_missions?active=eq.true&select=code,title,instructions,points&order=points.desc&limit=10')
  if (!missions?.length) {
    const empty = await send(chatId, 'No missions are active right now. Quality beats filler.')
    if (ephemeral && empty?.message_id) await scheduleCleanup(chatId, empty.message_id, 'mission_list', 15)
    return empty
  }
  const lines = missions.map(m => `<b>${escapeHtml(m.title)}</b> · ${m.points} points\n<code>${escapeHtml(m.code)}</code> — ${escapeHtml(m.instructions)}`)
  const posted = await send(chatId, `<b>ACTIVE CONTRIBUTOR MISSIONS</b> 🎯\n\n${lines.join('\n\n')}\n\nSubmit evidence with:\n<code>/submit mission-code https://your-public-link</code>${ephemeral ? '\n\nThis live list expires in 15 minutes.' : ''}`)
  if (ephemeral && posted?.message_id) await scheduleCleanup(chatId, posted.message_id, 'mission_list', 15)
  await recordEvent('missions_viewed', Number(chatId))
  return posted
}

async function submitMission(chatId, args) {
  const [missionCode, evidence] = args.trim().split(/\s+/, 2)
  let parsed
  try { parsed = new URL(evidence) } catch { parsed = null }
  if (!missionCode || !parsed || parsed.protocol !== 'https:' || parsed.href.length > 500) {
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
  const rank = contributorRank(points)
  await send(chatId, `<b>${rank}</b>\n${points} verified contribution points\n\nPoints measure approved work—not purchases, hype, or blind engagement.`)
}

async function showMyWork(message) {
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    try {
      return await send(message.from.id, 'Your contribution record is private. Use /mywork here to view it.')
    } catch {
      const username = BOT_USERNAME || (await telegram('getMe', {})).username
      return send(message.chat.id, 'Open MADGERbot privately first, then use /mywork.',
        keyboard([[{ text: 'Open private contribution record', url: `https://t.me/${escapeHtml(username)}` }]]))
    }
  }
  const rows = await db(`madger_bot_submissions?user_chat_id=eq.${encodeURIComponent(message.from.id)}&select=id,mission_code,evidence_url,status,review_note,created_at,reviewed_at&order=created_at.desc&limit=5`)
  if (!rows?.length) return send(message.chat.id, 'You have no mission submissions yet. Use /missions to find approved contribution work.')
  const lines = rows.map(row => {
    const status = row.status === 'approved' ? 'APPROVED ✅' : row.status === 'rejected' ? 'REJECTED' : 'PENDING ⏳'
    const note = row.review_note ? `\nReview: ${escapeHtml(String(row.review_note).slice(0, 300))}` : ''
    return `<b>#${row.id} · ${status}</b>\nMission: <code>${escapeHtml(row.mission_code)}</code>\n<a href="${escapeHtml(row.evidence_url)}">Open submitted evidence</a>${note}`
  })
  return send(message.chat.id, `<b>MY MADGER CONTRIBUTIONS</b>\n\n${lines.join('\n\n')}\n\nPoints are awarded only after administrator review.`)
}

async function showReviews(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'The review queue is private. Use /reviews here in your direct MADGERbot chat.')
  }
  const rows = await db('madger_bot_submissions?status=eq.pending&select=id,mission_code,user_chat_id,evidence_url,created_at&order=created_at.asc&limit=5')
  if (!rows?.length) return send(message.chat.id, '<b>MADGER REVIEW QUEUE</b>\n\nNo submissions are awaiting review.')
  const lines = rows.map(row => `<b>Submission #${row.id}</b>\nMission: <code>${escapeHtml(row.mission_code)}</code>\nContributor: <code>${row.user_chat_id}</code>\n<a href="${escapeHtml(row.evidence_url)}">Open evidence</a>\nApprove: <code>/approve ${row.id} optional-note</code>\nReject: <code>/reject ${row.id} reason</code>`)
  return send(message.chat.id, `<b>MADGER REVIEW QUEUE</b> 🧾\n\n${lines.join('\n\n')}\n\nShowing the oldest ${rows.length} pending submission${rows.length === 1 ? '' : 's'}.`)
}

async function showMissionList(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Mission administration is private. Use /missionlist here in your direct MADGERbot chat.')
  }
  const rows = await db('madger_bot_missions?select=code,title,points,active&order=active.desc,created_at.desc&limit=25')
  if (!rows?.length) return send(message.chat.id, 'No missions exist.')
  const lines = rows.map(row => `${row.active ? '🟢' : '⚫'} <code>${escapeHtml(row.code)}</code> · ${Number(row.points)} points\n${escapeHtml(row.title)}`)
  return send(message.chat.id, `<b>MADGER MISSION CONTROL</b>\n\n${lines.join('\n\n')}\n\n🟢 active · ⚫ closed`)
}

async function showLeaderboard(chatId) {
  const users = await db('madger_bot_users?points=gt.0&status=eq.active&select=username,points&order=points.desc,last_seen_at.asc&limit=10')
  if (!users?.length) return send(chatId, 'The contributor leaderboard is empty. Complete an active mission and pass human review to appear here.')
  const medals = ['🥇', '🥈', '🥉']
  const lines = users.map((user, index) => {
    const username = /^[A-Za-z0-9_]{5,32}$/.test(String(user.username ?? '')) ? `@${escapeHtml(user.username)}` : 'Anonymous contributor'
    return `${medals[index] ?? `${index + 1}.`} <b>${username}</b> — ${Number(user.points ?? 0)} points`
  })
  await send(chatId, `<b>MADGER CONTRIBUTOR LEADERBOARD</b> 🏆\n\n${lines.join('\n')}\n\nPoints represent administrator-approved contributions—not purchases, holdings, or spam.`)
  await recordEvent('leaderboard_viewed', Number(chatId))
}

async function manageMission(message, args, action) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Mission controls are private. Manage missions here in your direct MADGERbot chat.')
  }
  if (action === 'add') {
    const mission = parseMissionDefinition(args)
    if (!mission) return send(message.chat.id, 'Use: <code>/missionadd code | points | title | instructions</code>\n\nPoints: 10–1,000. Missions must reward genuine work—not purchases, wallet connections, spam, mass-tagging, harassment, or financial promises.')
    try {
      await insert('madger_bot_missions', { ...mission, active: true })
    } catch (error) {
      if (String(error).includes('duplicate')) return send(message.chat.id, 'That mission code already exists. Use /missionopen to reactivate it or choose a new code.')
      throw error
    }
    await recordEvent('mission_created', message.from.id, { mission_code: mission.code, points: mission.points })
    return send(message.chat.id, `<b>Mission activated.</b> 🎯\n<code>${escapeHtml(mission.code)}</code> · ${mission.points} points\n${escapeHtml(mission.title)}`)
  }

  const code = normalizeMissionCode(args)
  if (!code) return send(message.chat.id, `Use: <code>/mission${action} mission-code</code>`)
  const rows = await db(`madger_bot_missions?code=eq.${encodeURIComponent(code)}&select=code`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ active: action === 'open' })
  })
  if (!rows?.length) return send(message.chat.id, 'Mission not found.')
  await recordEvent(`mission_${action === 'open' ? 'opened' : 'closed'}`, message.from.id, { mission_code: code })
  return send(message.chat.id, `<b>Mission ${action === 'open' ? 'reactivated' : 'closed'}.</b>\n<code>${escapeHtml(code)}</code>`)
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

function buyAlertCaption({ amount, usdValue, buyer, tier, market, preview = false }) {
  const metric = value => value === null || value === undefined ? Number.NaN : Number(value)
  const price = metric(market?.priceUsd)
  const liquidity = metric(market?.liquidityUsd)
  const marketCap = metric(market?.marketCapUsd)
  return `${preview ? '<b>PREVIEW — NOT A LIVE BUY</b> 🧪\\n\\n' : ''}<b>MADGER BUY DETECTED</b> 🦡⚡

${tier.emoji} <b>${escapeHtml(tier.label)}</b>
<b>${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} $MADGER</b>
Approx. value: <b>${compactUsd(Number(usdValue))}</b>

Price: ${compactUsd(price)}
Market cap: ${compactUsd(marketCap, 0)}
Liquidity: ${compactUsd(liquidity, 0)}
Buyer: <code>${escapeHtml(compactWallet(buyer))}</code>

✅ Verified against the official Raydium pool
Mint: <code>${OFFICIAL_MINT}</code>`
}

async function buyPreview(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Buy-card previews are private. Use /buypreview in your direct MADGERbot chat.')
  }
  const rows = await db('madger_bot_market_snapshots?select=price_usd,liquidity_usd,raw,created_at&order=created_at.desc&limit=1')
  const market = marketSnapshotSummary(rows?.[0] ?? {})
  const usdValue = 250
  const amount = market.priceUsd > 0 ? usdValue / market.priceUsd : 250000
  await sendBuyCard(message.chat.id, buyAlertCaption({
    amount, usdValue, buyer: OFFICIAL_POOL, tier: buyTier(usdValue), market, preview: true
  }))
  await recordEvent('buy_preview_viewed', message.from.id)
}

async function buyStats(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Buy performance is private. Use /buystats in your direct MADGERbot chat.')
  }
  const since = encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())
  const rows = await db(`madger_bot_alerts?alert_type=eq.verified_buy&created_at=gte.${since}&select=token_amount,usd_value,metadata,created_at&order=created_at.desc&limit=1000`)
  const now = Date.now()
  const summarize = days => {
    const cutoff = now - days * 86400000
    const matches = (rows ?? []).filter(row => Date.parse(row.created_at) >= cutoff)
    return {
      count: matches.length,
      tokens: matches.reduce((sum, row) => sum + Number(row.token_amount ?? 0), 0),
      usd: matches.reduce((sum, row) => sum + Number(row.usd_value ?? 0), 0),
      largest: Math.max(0, ...matches.map(row => Number(row.usd_value ?? 0))),
      delivered: matches.filter(row => row.metadata?.delivery_status === 'delivered').length
    }
  }
  const one = summarize(1)
  const seven = summarize(7)
  return send(message.chat.id, `<b>MADGER BUY PERFORMANCE</b> 📡

<b>Last 24 hours</b>
Verified buys: ${one.count}
Cards delivered: ${one.delivered}/${one.count}
MADGER bought: ${one.tokens.toLocaleString('en-US', { maximumFractionDigits: 2 })}
Approx. volume: ${compactUsd(one.usd)}
Largest buy: ${compactUsd(one.largest)}

<b>Last 7 days</b>
Verified buys: ${seven.count}
Cards delivered: ${seven.delivered}/${seven.count}
MADGER bought: ${seven.tokens.toLocaleString('en-US', { maximumFractionDigits: 2 })}
Approx. volume: ${compactUsd(seven.usd)}
Largest buy: ${compactUsd(seven.largest)}

Only independently verified official-pool buys are counted.`)
}

async function adminHealth(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'System health is private. Use /health here in your direct MADGERbot chat.')
  }
  const bot = await telegram('getMe', {})
  const [webhook, membership, snapshots, cleanup, raidMode, chatSecurity, watcherHealth, recentBuys, holderHealth] = await Promise.all([
    telegram('getWebhookInfo', {}),
    BUY_CHAT_ID ? telegram('getChatMember', { chat_id: BUY_CHAT_ID, user_id: bot.id }).catch(() => null) : null,
    db('madger_bot_market_snapshots?select=created_at&order=created_at.desc&limit=1'),
    db('madger_bot_message_cleanup?deleted_at=is.null&select=message_id&limit=100'),
    raidModeForChat(BUY_CHAT_ID),
    chatSecurityInfo(BUY_CHAT_ID),
    setting('native_buy_watcher_health'),
    db('madger_bot_alerts?alert_type=eq.verified_buy&select=metadata,created_at&order=created_at.desc&limit=100'),
    setting('holder_monitor_health')
  ])
  const snapshotAt = Date.parse(String(snapshots?.[0]?.created_at ?? ''))
  const marketAge = Number.isFinite(snapshotAt) ? Math.max(0, Math.floor((Date.now() - snapshotAt) / 60000)) : null
  const webhookError = webhook.last_error_message
    ? `\nLast delivery error: ${escapeHtml(String(webhook.last_error_message).slice(0, 200))}`
    : ''
  const watcherAt = Date.parse(String(watcherHealth?.last_run_at ?? ''))
  const watcherAge = Number.isFinite(watcherAt) ? Math.max(0, Math.floor((Date.now() - watcherAt) / 60000)) : null
  const watcherFailures = (recentBuys ?? []).filter(row => row.metadata?.delivery_status === 'failed').length
  const holderAt = Date.parse(String(holderHealth?.last_run_at ?? ''))
  const holderAge = Number.isFinite(holderAt) ? Math.max(0, Math.floor((Date.now() - holderAt) / 60000)) : null
  return send(message.chat.id, `<b>MADGERBOT SYSTEM HEALTH</b> 🩺

Version: 3.4.0
Webhook: ${webhook.url ? 'connected ✅' : 'missing ❌'}
Pending Telegram updates: ${Number(webhook.pending_update_count ?? 0)}
Market monitor: ${marketAge === null ? 'no snapshot ❌' : marketAge <= 10 ? `current ✅ · ${marketAge}m old` : `stale ⚠️ · ${marketAge}m old`}
Buy watcher: ${watcherAge === null ? 'no run recorded ❌' : watcherAge <= 2 && !watcherHealth?.error ? `current ✅ · ${watcherAge}m old` : `attention ⚠️ · ${watcherAge}m old`}
Buy cadence: every minute
Last scan: ${Number(watcherHealth?.scanned ?? 0)} transactions · ${Number(watcherHealth?.verified ?? 0)} buys · ${Number(watcherHealth?.posted ?? 0)} cards
Recent card failures: ${watcherFailures}
Holder monitor: ${holderAge === null ? 'initializing' : holderAge <= 20 && !holderHealth?.error ? `current ✅ · ${holderAge}m old · ${holderHealth.holder_count} wallets` : `attention ⚠️ · ${holderAge}m old`}
Cleanup backlog: ${cleanup?.length ?? 0}${cleanup?.length === 100 ? '+' : ''}
Raid Shield: ${raidMode.active ? 'ACTIVE 🚨' : 'normal'}

<b>Burrow permissions</b>
Administrator: ${membership && ['administrator', 'creator'].includes(membership.status) ? 'yes ✅' : 'no ❌'}
Delete messages: ${membership?.can_delete_messages ? 'yes ✅' : 'no ❌'}
Restrict members: ${membership?.can_restrict_members ? 'yes ✅' : 'no ❌'}
Pin messages: ${membership?.can_pin_messages ? 'yes ✅' : 'no ❌'}
Native anti-spam: ${chatSecurity.aggressiveAntiSpam === null ? 'unknown' : chatSecurity.aggressiveAntiSpam ? 'on' : 'off'}
Slow mode: ${chatSecurity.slowModeSeconds ?? 'unknown'}s${webhookError}`)
}

async function moderationLog(message) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'The safety log is private. Use /modlog here in your direct MADGERbot chat.')
  }
  const types = 'moderation_action,member_report,admin_cleanup,admin_warn,admin_mute,admin_ban,admin_unmute,admin_clearwarns,raid_mode_activated,join_purged'
  const rows = await db(`madger_bot_events?event_type=in.(${types})&select=event_type,chat_id,metadata,created_at&order=created_at.desc&limit=10`)
  if (!rows?.length) return send(message.chat.id, '<b>MADGER SAFETY LOG</b>\n\nNo recent safety actions.')
  const lines = rows.map(row => {
    const at = new Date(row.created_at).toISOString().replace('T', ' ').slice(0, 16)
    const detail = row.metadata?.reason ?? row.metadata?.action ?? row.metadata?.mission_code ?? ''
    return `• <b>${escapeHtml(String(row.event_type).replaceAll('_', ' '))}</b> · ${at} UTC${detail ? `\n  ${escapeHtml(String(detail).slice(0, 160))}` : ''}`
  })
  return send(message.chat.id, `<b>MADGER SAFETY LOG</b> 🛡️\n\n${lines.join('\n')}\n\nAggregate operational records only; wallet credentials and private message contents are never stored.`)
}

async function reviewSubmission(message, args, status) {
  if (!ADMIN_IDS.has(String(message.from.id))) return send(message.chat.id, 'Admin command denied.')
  if (message.chat.type !== 'private') {
    await deleteQuietly(message.chat.id, message.message_id)
    return send(message.from.id, 'Submission reviews are private. Use /reviews here in your direct MADGERbot chat.')
  }
  const review = parseReviewRequest(args)
  if (!review) return send(message.chat.id, `Use: <code>/${status === 'approved' ? 'approve' : 'reject'} submission-id optional-note</code>\nReview notes may contain up to 300 characters.`)
  const result = await db('rpc/madger_bot_review_submission', {
    method: 'POST', body: JSON.stringify({ p_submission_id: review.id, p_status: status, p_reviewer_chat_id: Number(message.from.id), p_note: review.note })
  })
  const reviewed = result?.[0]
  await send(message.chat.id, `Submission ${review.id} ${status}.${status === 'approved' ? ` Awarded ${reviewed?.awarded_points ?? 0} points.` : ''}`)
  if (reviewed?.user_chat_id) await send(reviewed.user_chat_id, `Your mission submission ${review.id} was ${status}.${status === 'approved' ? ` +${reviewed.awarded_points} verified points.` : ''}${review.note ? `\nReview: ${escapeHtml(review.note)}` : ''}`)
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
    await recordEvent('admin_warn', message.from.id, { chat_id: message.chat.id, target_user_id: target.id, warning_count: count })
    return send(message.chat.id, `@${escapeHtml(target.username ?? target.first_name ?? String(target.id))} received an administrator warning (${count}).`)
  }
  if (command === 'mute') {
    const minutes = Math.min(1440, Math.max(1, Number.parseInt(args, 10) || MUTE_MINUTES))
    const until = Math.floor(Date.now() / 1000) + minutes * 60
    await restrictMember(message.chat.id, target.id, until)
    await saveModerationState({ chat_id: message.chat.id, user_id: target.id, restricted_until: new Date(until * 1000).toISOString() })
    await recordEvent('admin_mute', message.from.id, { chat_id: message.chat.id, target_user_id: target.id, minutes })
    return send(message.chat.id, `Member muted for ${minutes} minute${minutes === 1 ? '' : 's'}.`)
  }
  if (command === 'ban') {
    await telegram('banChatMember', { chat_id: message.chat.id, user_id: target.id, revoke_messages: true })
    await saveModerationState({ chat_id: message.chat.id, user_id: target.id, removed_at: new Date().toISOString() })
    await recordEvent('admin_ban', message.from.id, { chat_id: message.chat.id, target_user_id: target.id })
    return send(message.chat.id, 'Member banned and recent messages removed.')
  }
}

async function memberInfo(message) {
  if (!ADMIN_IDS.has(String(message.from.id)) && !await isChatAdmin(message.chat.id, message.from.id)) {
    return send(message.chat.id, 'Admin command denied.')
  }
  if (!isGroupChat(message.chat)) return send(message.chat.id, 'Use /memberinfo as a reply to a member inside The Burrow.')
  const target = message.reply_to_message?.from
  if (!target) return send(message.chat.id, 'Reply directly to a member with <code>/memberinfo</code>.')
  const state = await moderationState(message.chat.id, target.id)
  await deleteQuietly(message.chat.id, message.message_id)
  const username = target.username ? `@${escapeHtml(target.username)}` : escapeHtml(target.first_name ?? 'No public username')
  const details = `<b>MADGER MEMBER INSPECTION</b>

Member: ${username}
User ID: <code>${target.id}</code>
Warnings: ${Number(state?.warning_count ?? 0)}
Pending verification: ${state?.pending_verification ? 'yes' : 'no'}
Restricted until: ${state?.restricted_until ? escapeHtml(state.restricted_until) : 'not restricted'}
Removed at: ${state?.removed_at ? escapeHtml(state.removed_at) : 'never'}
Flood counter: ${Number(state?.flood_count ?? 0)}
Repeat counter: ${Number(state?.duplicate_count ?? 0)}`
  try {
    return await send(message.from.id, details)
  } catch {
    return send(message.chat.id, 'Open MADGERbot privately before using /memberinfo.')
  }
}

async function adminRecoveryAction(message, action) {
  if (!ADMIN_IDS.has(String(message.from.id)) && !await isChatAdmin(message.chat.id, message.from.id)) {
    return send(message.chat.id, 'Admin command denied.')
  }
  if (!isGroupChat(message.chat)) return send(message.chat.id, `Use /${action} as a reply to a member inside The Burrow.`)
  const target = message.reply_to_message?.from
  if (!target) return send(message.chat.id, `Reply directly to a member with <code>/${action}</code>.`)
  if (await isChatAdmin(message.chat.id, target.id)) return send(message.chat.id, 'MADGERbot will not alter an administrator.')
  if (action === 'unmute') {
    await restoreMember(message.chat.id, target.id)
    await saveModerationState({
      chat_id: message.chat.id, user_id: target.id, restricted_until: null,
      pending_verification: false, verification_deadline: null
    })
    await recordEvent('admin_unmute', message.from.id, { chat_id: message.chat.id, target_user_id: target.id })
    return send(message.chat.id, `@${escapeHtml(target.username ?? target.first_name ?? String(target.id))} can speak again.`)
  }
  await saveModerationState({
    chat_id: message.chat.id, user_id: target.id, warning_count: 0,
    flood_count: 0, duplicate_count: 0, duplicate_hash: null
  })
  await recordEvent('admin_clearwarns', message.from.id, { chat_id: message.chat.id, target_user_id: target.id })
  return send(message.chat.id, `Warnings and spam counters cleared for @${escapeHtml(target.username ?? target.first_name ?? String(target.id))}.`)
}

async function cleanupMessage(message) {
  if (!ADMIN_IDS.has(String(message.from.id)) && !await isChatAdmin(message.chat.id, message.from.id)) {
    return send(message.chat.id, 'Admin command denied.')
  }
  if (!isGroupChat(message.chat)) return send(message.chat.id, 'Use /cleanup as a reply to an obsolete message inside The Burrow.')
  const target = message.reply_to_message
  if (!target) return send(message.chat.id, 'Reply directly to the obsolete message with <code>/cleanup</code>.')
  try {
    await telegram('deleteMessage', { chat_id: message.chat.id, message_id: target.message_id })
  } catch {
    return send(message.chat.id, 'Telegram could not remove that message. Confirm MADGERbot still has permission to delete messages.')
  }
  await deleteQuietly(message.chat.id, message.message_id)
  await recordEvent('admin_cleanup', message.from.id, {
    chat_id: message.chat.id, deleted_message_id: target.message_id,
    deleted_sender_id: target.from?.id ?? null, deleted_sender_is_bot: target.from?.is_bot ?? null
  })
  const confirmation = await send(message.chat.id, 'Obsolete message removed.')
  if (confirmation?.message_id) await scheduleCleanup(message.chat.id, confirmation.message_id, 'cleanup_confirmation', 1)
  return confirmation
}

async function handleCommand(message) {
  const chatId = message.chat.id
  const raw = message.text?.trim() ?? ''
  const [commandWithBot, ...rest] = raw.split(/\s+/)
  const command = commandWithBot.toLowerCase().split('@')[0]
  const args = rest.join(' ')
  const startIntent = command === '/start' ? args.trim().toLowerCase() : ''
  const startRef = command === '/start' && startIntent !== 'teams' ? normalizeReferral(args) : null
  await registerUser(message.from, startRef)

  if (command === '/start' && startIntent === 'teams') return showTeams(message)
  if (command === '/start') return showWelcome(chatId, message.from, startRef)
  if (command === '/buy') return send(chatId, `<b>BUY $MADGER SAFELY</b>\n\nOfficial mint:\n<code>${OFFICIAL_MINT}</code>\n\nMADGER never presets your amount or slippage. Review every wallet prompt before approving.`, conversionKeyboard())
  if (command === '/mint' || command === '/verify' || command === '/ca' || command === '/contract') return send(chatId, `<b>OFFICIAL MADGER MINT</b>\n<code>${OFFICIAL_MINT}</code>\n\nPool:\n<code>${OFFICIAL_POOL}</code>`, keyboard([[{ text: 'Open canonical verification', url: LINKS.verify }]]))
  if (command === '/price') return showMarket(chatId)
  if (command === '/pool' || command === '/liquidity') return showPool(chatId)
  if (command === '/risk') return showRisk(chatId)
  if (command === '/holders') return showHolders(chatId)
  if (command === '/chart') return send(chatId, '<b>MADGER VERIFIED CHART</b> 📈\nThis link is locked to the official Raydium pool.', keyboard([[{ text: 'Open live chart', url: LINKS.dex }]]))
  if (command === '/links') return showOfficialLinks(chatId)
  if (command === '/help') return showHelp(chatId)
  if (command === '/missions') return showMissions(chatId, isGroupChat(message.chat))
  if (command === '/submit') return submitMission(chatId, args)
  if (command === '/mywork') return showMyWork(message)
  if (command === '/rank') return showRank(chatId)
  if (command === '/leaderboard') return showLeaderboard(chatId)
  if (command === '/referral') return showReferral(chatId)
  if (command === '/rules') return showRules(chatId)
  if (command === '/safety') return showSafety(chatId)
  if (command === '/report') return reportMessage(message)
  if (command === '/teams') return showTeams(message)
  if (command === '/jointeam') return setTeamFromCommand(message, args, true)
  if (command === '/leaveteam') return setTeamFromCommand(message, args, false)
  if (command === '/teamalert') return launchTeamAlert(message, args)
  if (command === '/teamstats') return teamStats(message)
  if (command === '/announce') return publishAnnouncement(message, args, false)
  if (command === '/announcepin') return publishAnnouncement(message, args, true)
  if (command === '/dashboard') return adminDashboard(message)
  if (command === '/health') return adminHealth(message)
  if (command === '/modlog') return moderationLog(message)
  if (command === '/raidmode') return manageRaidMode(message, args)
  if (command === '/purgeunverified') return purgeUnverified(message)
  if (command === '/faqmode') return manageFaqMode(message, args)
  if (command === '/whoami') return send(chatId, `Your Telegram user ID is <code>${message.from.id}</code>. Treat admin IDs as operational configuration, not public content.`)
  if (command === '/chatid') return send(chatId, `This chat ID is <code>${message.chat.id}</code>. Use it only in the bot's secure runtime configuration.`)
  if (command === '/stats') return adminStats(chatId)
  if (command === '/buypreview') return buyPreview(message)
  if (command === '/buystats') return buyStats(message)
  if (command === '/holderintel') return showHolderIntel(message)
  if (command === '/reviews') return showReviews(message)
  if (command === '/missionlist') return showMissionList(message)
  if (command === '/approve') return reviewSubmission(message, args, 'approved')
  if (command === '/reject') return reviewSubmission(message, args, 'rejected')
  if (command === '/missionadd') return manageMission(message, args, 'add')
  if (command === '/missionclose') return manageMission(message, args, 'close')
  if (command === '/missionopen') return manageMission(message, args, 'open')
  if (command === '/warn') return adminModerationAction(message, 'warn', args)
  if (command === '/mute') return adminModerationAction(message, 'mute', args)
  if (command === '/ban') return adminModerationAction(message, 'ban', args)
  if (command === '/unmute') return adminRecoveryAction(message, 'unmute')
  if (command === '/clearwarns') return adminRecoveryAction(message, 'clearwarns')
  if (command === '/memberinfo') return memberInfo(message)
  if (command === '/cleanup') return cleanupMessage(message)
  return send(chatId, 'Commands: /buy · /price · /pool · /risk · /holders · /verify · /missions · /submit · /mywork · /rank · /leaderboard · /referral · /teams · /rules · /safety · /report')
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
  const strictLinks = /https?:\/\//i.test(text) && (await raidModeForChat(message.chat.id)).active
  const reason = moderationReason(text, { strictLinks })
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
  const notice = await send(message.chat.id, `<b>MADGER Guard:</b> ${escapeHtml(reason)}. ${publicAction}\nUse /safety for the official protection standard.`)
  await scheduleCleanup(message.chat.id, notice.message_id, 'moderation_notice', 5)
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
    if (String(update.callback_query.data ?? '').startsWith('team_join:') || String(update.callback_query.data ?? '').startsWith('team_leave:')) return setTeamMembership(update.callback_query)
    await telegram('answerCallbackQuery', { callback_query_id: update.callback_query.id })
    if (update.callback_query.data === 'missions') await showMissions(update.callback_query.message.chat.id, isGroupChat(update.callback_query.message.chat))
    return
  }
  const message = update.message ?? update.channel_post
  if (!message) return
  if (message.new_chat_members?.length) return welcomeNewMembers(message)
  if (await moderate(message)) return
  if (message.text?.startsWith('/') && message.from) await handleCommand(message)
  else if (message.from) {
    await registerUser(message.from, null)
    await maybeAnswerFaq(message)
  }
}

async function routeRedirect(request, url) {
  const route = url.pathname.split('/').filter(Boolean).at(-1)
  const target = LINKS[route]
  if (!target) return new Response('Unknown route', { status: 404 })
  const ref = normalizeReferral(url.searchParams.get('ref'))
  await recordEvent('referral_open', null, { route }, ref)
  return Response.redirect(target, 302)
}

async function publishVerifiedBuy(signature, buyer, amount, market, source) {
  const priceUsd = Number(typeof market === 'number' ? market : market?.priceUsd ?? 0)
  const usdValue = amount * priceUsd
  const tier = buyTier(usdValue)
  let inserted
  let deliveryAttempts = 0
  let retried = false
  try {
    inserted = await insert('madger_bot_alerts', {
      alert_type: 'verified_buy', transaction_signature: signature, buyer_wallet: buyer,
      token_amount: amount, usd_value: usdValue,
      metadata: { source, delivery_status: BUY_CHAT_ID ? 'pending' : 'skipped', delivery_attempts: 0 }
    }, 'return=representation')
  } catch (error) {
    if (!String(error).includes('duplicate')) throw error
    const existing = await db(`madger_bot_alerts?transaction_signature=eq.${encodeURIComponent(signature)}&select=id,metadata,created_at&limit=1`)
    const alert = existing?.[0]
    const status = alert?.metadata?.delivery_status
    const age = Date.now() - Date.parse(String(alert?.created_at ?? ''))
    if (!BUY_CHAT_ID || !alert || !['pending', 'failed'].includes(status) || !Number.isFinite(age) || age > 6 * 3600000) {
      return { duplicate: true, instant: false, tier: tier.label }
    }
    inserted = existing
    deliveryAttempts = Number(alert.metadata?.delivery_attempts ?? 0)
    retried = true
  }
  const alertId = inserted?.[0]?.id
  if (BUY_CHAT_ID) {
    try {
      const delivered = await sendBuyCard(BUY_CHAT_ID, buyAlertCaption({ amount, usdValue, buyer, tier, market }), signature)
      if (alertId) await db(`madger_bot_alerts?id=eq.${alertId}`, {
        method: 'PATCH', body: JSON.stringify({
          metadata: {
            source, delivery_status: 'delivered', delivered_at: new Date().toISOString(),
            telegram_message_id: delivered.message?.message_id ?? null,
            delivery_attempts: deliveryAttempts + 1, delivery_method: delivered.deliveryMethod
          }
        })
      })
    } catch (error) {
      if (alertId) await db(`madger_bot_alerts?id=eq.${alertId}`, {
        method: 'PATCH', body: JSON.stringify({
          metadata: {
            source, delivery_status: 'failed', delivery_attempts: deliveryAttempts + 1,
            last_delivery_error: String(error instanceof Error ? error.message : error).slice(0, 300)
          }
        })
      })
      throw error
    }
  }
  return { duplicate: false, retried, instant: Boolean(BUY_CHAT_ID), tier: tier.label }
}

async function scanVerifiedBuys(market) {
  const firstPage = await solanaRpc('getSignaturesForAddress', [
    OFFICIAL_POOL, { commitment: 'confirmed', limit: 50 }
  ]) ?? []
  const signatures = [...firstPage]
  const newestUsable = firstPage.find(item => item?.signature && !item.err)
  if (!newestUsable) return { initialized: false, scanned: 0, verified: 0, posted: 0 }

  const checkpointKey = 'native_buy_watcher_checkpoint'
  const checkpoint = String(await setting(checkpointKey) ?? '')
  if (!checkpoint) {
    await saveSetting(checkpointKey, newestUsable.signature)
    return { initialized: true, scanned: 0, verified: 0, posted: 0 }
  }

  let checkpointFound = signatures.some(item => item.signature === checkpoint)
  let before = signatures.at(-1)?.signature
  for (let page = 1; page < 4 && !checkpointFound && before; page += 1) {
    const batch = await solanaRpc('getSignaturesForAddress', [
      OFFICIAL_POOL, { commitment: 'confirmed', limit: 50, before }
    ]) ?? []
    if (!batch.length) break
    signatures.push(...batch)
    checkpointFound = batch.some(item => item.signature === checkpoint)
    before = batch.at(-1)?.signature
  }
  const planned = pendingSignatures(signatures, checkpoint, 100)
  const pending = planned.items
  let scanned = 0
  let verified = 0
  let posted = 0
  let error = null
  for (const item of pending) {
    try {
      const transaction = await solanaRpc('getTransaction', [item.signature, {
        encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed'
      }])
      if (!transaction) throw new Error('confirmed transaction was unavailable')
      const buyer = findVerifiedMadgerBuyers(transaction)[0]
      if (buyer) {
        const result = await publishVerifiedBuy(item.signature, buyer.buyer, buyer.amount, market, 'native_pool_watcher')
        verified += 1
        if (result.instant && !result.duplicate) posted += 1
      }
      scanned += 1
      await saveSetting(checkpointKey, item.signature)
    } catch (cause) {
      error = String(cause instanceof Error ? cause.message : cause)
      break
    }
  }
  return {
    initialized: false, scanned, verified, posted,
    checkpoint_found: planned.checkpointFound,
    catchup_truncated: planned.truncated,
    ...(error ? { error } : {})
  }
}

async function watchVerifiedBuys(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  const startedAt = Date.now()
  let result
  try {
    const latest = await db('madger_bot_market_snapshots?select=price_usd,liquidity_usd,raw,created_at&order=created_at.desc&limit=1')
    result = await scanVerifiedBuys(marketSnapshotSummary(latest?.[0] ?? {}))
  } catch (error) {
    result = { scanned: 0, verified: 0, posted: 0, error: String(error instanceof Error ? error.message : error).slice(0, 300) }
  }
  await saveSetting('native_buy_watcher_health', {
    last_run_at: new Date().toISOString(), duration_ms: Date.now() - startedAt, ...result
  })
  return Response.json({ ok: !result.error, buy_watcher: result }, { status: result.error ? 503 : 200 })
}

async function monitorMarket(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  await Promise.all([sweepExpiredJoins(), sweepMessageCleanup()])
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

async function monitorHolders(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  const startedAt = Date.now()
  try {
    const [tokenAccounts, supplyResult, previousRows, marketRows] = await Promise.all([
      solanaRpc('getProgramAccounts', [TOKEN_PROGRAM, {
        encoding: 'jsonParsed', commitment: 'confirmed',
        filters: [{ dataSize: 165 }, { memcmp: { offset: 0, bytes: OFFICIAL_MINT } }]
      }]),
      solanaRpc('getTokenSupply', [OFFICIAL_MINT, { commitment: 'confirmed' }]),
      db('madger_bot_holder_snapshots?select=*&order=created_at.desc&limit=1'),
      db('madger_bot_market_snapshots?select=price_usd&order=created_at.desc&limit=1')
    ])
    const totalSupply = Number(supplyResult?.value?.uiAmountString ?? supplyResult?.value?.uiAmount ?? 0)
    const current = holderSnapshotFromAccounts(tokenAccounts, totalSupply)
    if (!(current.totalSupply > 0) || !current.holderCount) throw new Error('holder RPC returned no positive MADGER balances')
    const previous = previousRows?.[0]
    const priceUsd = Number(marketRows?.[0]?.price_usd ?? 0)
    const movements = significantHolderMovements(current, previous?.raw, { priceUsd })
    await insert('madger_bot_holder_snapshots', {
      holder_count: current.holderCount,
      token_account_count: tokenAccounts.length,
      total_supply: current.totalSupply,
      largest_percentage: current.largestPercentage,
      top_10_percentage: current.top10Percentage,
      raw: { owners: current.owners }
    })

    const holderChange = previous ? current.holderCount - Number(previous.holder_count) : 0
    if (ADMIN_CHAT_ID && previous && (movements.length || Math.abs(holderChange) >= 2)) {
      const movementLines = movements.slice(0, 5).map(item =>
        `• <code>${escapeHtml(compactWallet(item.owner))}</code> · ${item.delta >= 0 ? '+' : ''}${item.delta.toLocaleString('en-US', { maximumFractionDigits: 2 })} MADGER · ${item.supplyPercentage.toFixed(2)}% of supply${priceUsd > 0 ? ` · ~${compactUsd(item.approximateUsd)}` : ''}`
      )
      await send(ADMIN_CHAT_ID, `<b>MADGER HOLDER MOVEMENT</b> 🔬

Wallet-count change: ${holderChange >= 0 ? '+' : ''}${holderChange}
${movementLines.length ? movementLines.join('\n') : 'No individual movement crossed the alert threshold.'}

These are on-chain balance movements—not classified buys or sells. Treasury, liquidity, exchange, and custodial activity may be included.`, keyboard([[{ text: 'Inspect official token', url: LINKS.solscanToken }]]))
      await recordEvent('holder_movement_alert', null, {
        holder_change: holderChange, movement_count: movements.length,
        largest_movement_percentage: movements[0]?.supplyPercentage ?? 0
      })
    }
    const health = {
      last_run_at: new Date().toISOString(), duration_ms: Date.now() - startedAt,
      holder_count: current.holderCount, token_account_count: tokenAccounts.length,
      holder_change: holderChange, movement_count: movements.length
    }
    await saveSetting('holder_monitor_health', health)
    return Response.json({ ok: true, holder_monitor: health })
  } catch (error) {
    const health = {
      last_run_at: new Date().toISOString(), duration_ms: Date.now() - startedAt,
      error: String(error instanceof Error ? error.message : error).slice(0, 300)
    }
    await saveSetting('holder_monitor_health', health)
    return Response.json({ ok: false, holder_monitor: health }, { status: 503 })
  }
}

async function verifyBuyAlert(request) {
  if (!await authenticateInternal(request)) return new Response('Unauthorized', { status: 401 })
  const body = await request.json()
  const signature = String(body.signature ?? '')
  const buyer = String(body.buyer ?? '')
  if (!signature || !buyer) return new Response('Missing signature or buyer', { status: 400 })
  const transaction = await solanaRpc('getTransaction', [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])
  if (!transaction || transaction.meta?.err) return new Response('Transaction not confirmed', { status: 422 })
  const verifiedBuyer = findVerifiedMadgerBuyers(transaction).find(item => item.buyer === buyer)
  if (!verifiedBuyer) return new Response('No verified MADGER purchase for buyer', { status: 422 })
  const latest = await db('madger_bot_market_snapshots?select=price_usd,liquidity_usd,raw,created_at&order=created_at.desc&limit=1')
  const market = marketSnapshotSummary(latest?.[0] ?? {})
  const result = await publishVerifiedBuy(signature, buyer, verifiedBuyer.amount, market, body.source ?? 'webhook')
  return Response.json({ ok: true, verified: true, ...result })
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
  const publicCommands = [
    { command: 'buy', description: 'Open verified MADGER purchase routes' },
    { command: 'price', description: 'Latest MADGER market snapshot' },
    { command: 'pool', description: 'Official pool liquidity and activity' },
    { command: 'risk', description: 'Verified MADGER risk snapshot' },
    { command: 'holders', description: 'On-chain MADGER holder intelligence' },
    { command: 'chart', description: 'Open the verified live chart' },
    { command: 'ca', description: 'Copy the official MADGER mint' },
    { command: 'links', description: 'Open verified MADGER links' },
    { command: 'verify', description: 'Verify the official mint and pool' },
    { command: 'missions', description: 'View active contributor missions' },
    { command: 'submit', description: 'Submit mission evidence' },
    { command: 'mywork', description: 'View your private submission history' },
    { command: 'rank', description: 'View contribution points and rank' },
    { command: 'leaderboard', description: 'Top approved MADGER contributors' },
    { command: 'referral', description: 'Create your attributable invite link' },
    { command: 'teams', description: 'Join or leave MADGER promotion teams' },
    { command: 'jointeam', description: 'Join raid or outreach alerts privately' },
    { command: 'leaveteam', description: 'Leave raid or outreach alerts' },
    { command: 'rules', description: 'Read The Burrow community rules' },
    { command: 'safety', description: 'Read the official wallet safety standard' },
    { command: 'report', description: 'Reply to suspicious content to report it' },
    { command: 'help', description: 'Show MADGERbot commands' },
    { command: 'whoami', description: 'Display your numeric Telegram ID' },
    { command: 'chatid', description: 'Display the current chat ID' }
  ]
  const adminCommands = [...publicCommands,
    { command: 'dashboard', description: 'Admin command-center dashboard' },
    { command: 'health', description: 'Admin system health console' },
    { command: 'modlog', description: 'Admin recent safety activity' },
    { command: 'raidmode', description: 'Admin Raid Shield controls' },
    { command: 'purgeunverified', description: 'Admin removal of pending joins' },
    { command: 'faqmode', description: 'Admin FAQ responder controls' },
    { command: 'announce', description: 'Admin official Burrow announcement' },
    { command: 'announcepin', description: 'Admin announcement with pin request' },
    { command: 'teamalert', description: 'Admin promotion-team alert' },
    { command: 'teamstats', description: 'Admin promotion-team counts' },
    { command: 'missionadd', description: 'Admin create contributor mission' },
    { command: 'missionclose', description: 'Admin close contributor mission' },
    { command: 'missionopen', description: 'Admin reactivate contributor mission' },
    { command: 'missionlist', description: 'Admin view all mission statuses' },
    { command: 'reviews', description: 'Admin pending submission queue' },
    { command: 'stats', description: 'Admin seven-day bot report' },
    { command: 'buypreview', description: 'Admin preview of the branded buy card' },
    { command: 'buystats', description: 'Admin verified-buy delivery performance' },
    { command: 'holderintel', description: 'Admin holder concentration console' },
    { command: 'warn', description: 'Admin reply-based warning' },
    { command: 'mute', description: 'Admin reply-based temporary mute' },
    { command: 'ban', description: 'Admin reply-based removal' },
    { command: 'unmute', description: 'Admin restore a muted member' },
    { command: 'clearwarns', description: 'Admin reset member warning counters' },
    { command: 'memberinfo', description: 'Admin inspect a member privately' },
    { command: 'cleanup', description: 'Admin remove an obsolete message' }
  ]
  await telegram('setMyCommands', { commands: publicCommands })
  for (const adminId of ADMIN_IDS) {
    await telegram('setMyCommands', { commands: adminCommands, scope: { type: 'chat', chat_id: Number(adminId) } })
  }
  let guard = { configured: false, can_delete_messages: false, can_restrict_members: false, can_pin_messages: false, aggressive_anti_spam: null, slow_mode_seconds: null }
  if (BUY_CHAT_ID) {
    try {
      const [membership, security] = await Promise.all([
        telegram('getChatMember', { chat_id: BUY_CHAT_ID, user_id: bot.id }),
        chatSecurityInfo(BUY_CHAT_ID)
      ])
      guard = {
        configured: membership.status === 'administrator' || membership.status === 'creator',
        can_delete_messages: Boolean(membership.can_delete_messages),
        can_restrict_members: Boolean(membership.can_restrict_members),
        can_pin_messages: Boolean(membership.can_pin_messages),
        aggressive_anti_spam: security.aggressiveAntiSpam,
        slow_mode_seconds: security.slowModeSeconds
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
      return Response.json({ ok: true, service: 'MADGER Command Bot', version: '3.4.0', configured: Boolean(BOT_TOKEN && WEBHOOK_SECRET), operations_console: true, moderation_log: true, member_inspection: true, moderation_recovery: true, community_guard: true, raid_shield: true, raid_link_firewall: true, stale_content_cleanup: true, faq_responder: true, market_commands: true, pool_intelligence: true, risk_snapshot: true, liquidity_trends: true, holder_intelligence: true, holder_growth: true, concentration_tracking: true, wallet_movement_alerts: true, promotion_teams: true, announcements: true, contributor_leaderboard: true, contributor_history: true, mission_admin: true, review_queue: true, native_buy_watcher: true, one_minute_buy_watcher: true, catchup_scanner: true, watcher_health: true, every_verified_buy: true, branded_buy_cards: true, buy_delivery_telemetry: true })
    }
    if (url.pathname.endsWith('/setup')) return setupTelegram(request)
    if (url.pathname.endsWith('/watch-buys')) return watchVerifiedBuys(request)
    if (url.pathname.endsWith('/monitor-holders')) return monitorHolders(request)
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
