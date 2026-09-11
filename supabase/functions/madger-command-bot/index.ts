import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  LINKS, OFFICIAL_MINT, OFFICIAL_POOL, buyTier, escapeHtml,
  isSuspiciousMadgerMessage, marketAlertReasons, normalizeReferral
} from './core.js'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const BOT_USERNAME = Deno.env.get('TELEGRAM_BOT_USERNAME') ?? ''
const ADMIN_IDS = new Set((Deno.env.get('TELEGRAM_ADMIN_CHAT_IDS') ?? '').split(',').map(v => v.trim()).filter(Boolean))
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHANNEL_ID') ?? [...ADMIN_IDS][0] ?? ''
const BUY_CHAT_ID = Deno.env.get('TELEGRAM_BUY_ALERT_CHAT_ID') ?? ADMIN_CHAT_ID
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com'
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : ''

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

async function send(chatId, text, replyMarkup) {
  return telegram('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
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
  if (command === '/stats') return adminStats(chatId)
  if (command === '/approve') return reviewSubmission(chatId, args, 'approved')
  if (command === '/reject') return reviewSubmission(chatId, args, 'rejected')
  return send(chatId, 'Commands: /buy · /verify · /missions · /submit · /rank · /referral')
}

async function moderate(message) {
  const text = message.text ?? message.caption ?? ''
  if (!text || !isSuspiciousMadgerMessage(text)) return false
  try { await telegram('deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }) } catch { /* bot may lack delete permission */ }
  await send(message.chat.id, `<b>Unverified MADGER address removed.</b>\nUse only the complete official mint:\n<code>${OFFICIAL_MINT}</code>\n\nVerify through madgercoin.com before taking any action.`)
  await recordEvent('suspicious_address', message.from?.id ?? null, { chat_id: message.chat.id, username: message.from?.username ?? null })
  if (ADMIN_CHAT_ID) await send(ADMIN_CHAT_ID, `<b>Security alert</b>\nAn unverified address associated with MADGER was detected in chat <code>${message.chat.id}</code>. Evidence is recorded without republishing the address.`)
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
    await telegram('answerCallbackQuery', { callback_query_id: update.callback_query.id })
    if (update.callback_query.data === 'missions') await showMissions(update.callback_query.message.chat.id)
    return
  }
  const message = update.message ?? update.channel_post
  if (!message) return
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

Deno.serve(async request => {
  try {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname.includes('/go/')) return routeRedirect(request, url)
    if (request.method === 'GET') {
      return Response.json({ ok: true, service: 'MADGER Command Bot', version: '1.0.0', configured: Boolean(BOT_TOKEN && WEBHOOK_SECRET) })
    }
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
