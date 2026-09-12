export const OFFICIAL_MINT = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv'
export const OFFICIAL_POOL = 'FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h'
export const RAYDIUM_CPMM_PROGRAM = 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

export const PROJECT_WALLETS = Object.freeze([
  { role: 'Liquidity reserve', address: 'ATFELs8fV9CthKDjVLfhMb756uD499nHVtzLr5i7XKPp', targetPercentage: 60 },
  { role: 'Treasury', address: 'Ge91NeKSg4uYci29mq2XN5N4KQsnoXtkWBPEorPa63aZ', targetPercentage: 20 },
  { role: 'Community', address: 'EVSB7eT5ws43oi2ztWKNQvH4THXQD3k9z6Sk9NNFP1FT', targetPercentage: 10 },
  { role: 'Operations', address: 'C29Y6p3NXgi5UauC3W9PVN7SDguk9EA2e5oDDJEHRxNz', targetPercentage: 7 },
  { role: 'Creator reserve', address: 'GWyajcELd3nM1NtfvkJoXz2AgYYinqyZzqAC4NQyBzsi', targetPercentage: 3 }
])

export const LOCK_RECORDS = Object.freeze([
  {
    id: 'strategic-reserve', label: 'Strategic Reserve', asset: 'MADGER',
    address: '5LVpo5QrNJPuasud75CuF3gRtipFStkR2seyWMgg5E8V', expectedAmount: 499999999.99968,
    provider: 'Jupiter Lock', cliffDate: '2027-09-08', endDate: '2030-09-07'
  },
  {
    id: 'lp-expansion', label: 'Expansion LP', asset: 'RAYDIUM LP',
    address: 'rZbKNf3G2sLhNjaB5TSqy5TUbKPWgu2gBkw3VggqTkB', expectedAmount: 188.436429189,
    provider: 'Streamflow', cliffDate: null, endDate: null
  },
  {
    id: 'lp-original', label: 'Original LP', asset: 'RAYDIUM LP',
    address: '9EVSaGAP7gDmuJAwzL4DWN6V7eHPVgd4UMzMmxnF2VkX', expectedAmount: 46.241020429,
    provider: 'Streamflow', cliffDate: '2027-09-07', endDate: '2027-09-07'
  }
])

export const LINKS = Object.freeze({
  home: 'https://madgercoin.com/',
  guide: 'https://madgercoin.com/buy',
  raydium: `https://raydium.io/liquidity-pools/?token=${OFFICIAL_MINT}`,
  dex: `https://dexscreener.com/solana/${OFFICIAL_POOL.toLowerCase()}`,
  verify: 'https://madgercoin.com/launch.html',
  official: 'https://madgercoin.com/official-links.html',
  buyCard: 'https://madgercoin.com/assets/madger_social_share_v10.jpg',
  solscanToken: `https://solscan.io/token/${OFFICIAL_MINT}`,
  community: 'https://t.me/madgerburrow',
  bonkbot: 'https://bonkbot.io/',
  trojan: 'https://trojan.com/'
})

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character])
}

export function normalizeReferral(value) {
  const code = String(value ?? '').trim().toLowerCase().replace(/^ref_/, '')
  return /^[a-z0-9_-]{4,32}$/.test(code) ? code : null
}

export function normalizeMissionCode(value) {
  const code = String(value ?? '').trim().toLowerCase()
  return /^[a-z0-9_-]{3,32}$/.test(code) ? code : null
}

export function parseMissionDefinition(value) {
  const [codeValue = '', pointsValue = '', titleValue = '', ...instructionParts] = String(value ?? '').split('|').map(part => part.trim())
  const code = normalizeMissionCode(codeValue)
  const points = Number(pointsValue)
  const instructions = instructionParts.join(' | ').trim()
  if (!code || !Number.isInteger(points) || points < 10 || points > 1000) return null
  if (titleValue.length < 5 || titleValue.length > 80 || instructions.length < 10 || instructions.length > 500) return null

  const missionText = `${titleValue} ${instructions}`
  const rewardsFinancialActivity = /(?:buy|purchase|hold|deposit|transfer)\s+(?:at least\s+)?(?:\$?\d|madger|tokens?|sol\b|usdc\b)|send\s+(?:money|sol\b|usdc\b)|connect\s+(?:your\s+)?wallet/i
  const abusivePromotion = /(?:mass\s+(?:dm|message|tag)|tag\s+everyone|copy[- ]?paste\s+(?:this\s+)?(?:everywhere|into)|spam|harass|guaranteed\s+returns?)/i
  if (rewardsFinancialActivity.test(missionText) || abusivePromotion.test(missionText)) return null
  return { code, points, title: titleValue, instructions }
}

export function contributorRank(points) {
  const value = Math.max(0, Number(points) || 0)
  if (value >= 1000) return 'Burrow Elite'
  if (value >= 500) return 'Verified Creator'
  if (value >= 250) return 'Claw Contributor'
  if (value >= 100) return 'Scout'
  return 'Burrow Member'
}

export function parseReviewRequest(value) {
  const [idValue = '', ...noteParts] = String(value ?? '').trim().split(/\s+/)
  const id = Number(idValue)
  const note = noteParts.join(' ').trim()
  if (!Number.isSafeInteger(id) || id <= 0 || note.length > 300) return null
  return { id, note: note || null }
}

export function extractSolanaCandidates(text) {
  return String(text ?? '').match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) ?? []
}

export function isSuspiciousMadgerMessage(text) {
  const value = String(text ?? '')
  if (!/madger|\$madger/i.test(value)) return false
  const candidates = extractSolanaCandidates(value)
  return candidates.some(candidate => candidate !== OFFICIAL_MINT && candidate !== OFFICIAL_POOL)
}

const TRUSTED_HOSTS = new Set([
  'madgercoin.com', 'www.madgercoin.com', 'raydium.io', 'www.raydium.io',
  'dexscreener.com', 'www.dexscreener.com', 'solscan.io', 'www.solscan.io',
  't.me', 'telegram.me', 'x.com', 'twitter.com'
])

const RAID_SHIELD_LINK_HOSTS = new Set([
  'madgercoin.com', 'www.madgercoin.com', 'raydium.io', 'www.raydium.io',
  'dexscreener.com', 'www.dexscreener.com', 'solscan.io', 'www.solscan.io'
])

const SHORTENER_HOSTS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'shorturl.at', 'rebrand.ly',
  'is.gd', 'rb.gy', 'ow.ly'
])

export function extractHttpHosts(text) {
  const hosts = []
  for (const raw of String(text ?? '').match(/https?:\/\/[^\s<>]+/gi) ?? []) {
    try { hosts.push(new URL(raw.replace(/[),.!?]+$/, '')).hostname.toLowerCase()) } catch { /* ignore malformed URLs */ }
  }
  return hosts
}

export function inspectLinkSafety(value) {
  let url
  try { url = new URL(String(value ?? '').trim()) } catch { return { level: 'invalid', reason: 'not a valid URL', host: null } }
  if (url.protocol !== 'https:') return { level: 'danger', reason: 'not protected by HTTPS', host: url.hostname.toLowerCase() }
  const host = url.hostname.toLowerCase()
  if (TRUSTED_HOSTS.has(host)) return { level: 'trusted', reason: 'matches the MADGER trusted-domain registry', host }
  if (url.username || url.password) return { level: 'danger', reason: 'contains hidden URL credentials', host }
  if (/^xn--|\.xn--/.test(host)) return { level: 'danger', reason: 'uses internationalized domain encoding that can conceal lookalikes', host }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\[[0-9a-f:]+\]$/i.test(host)) return { level: 'danger', reason: 'uses a raw network address instead of a verified domain', host }
  if (SHORTENER_HOSTS.has(host)) return { level: 'danger', reason: 'hides its destination behind a link shortener', host }
  if (/madger|raydi[uv]m|solsc[a@]n|phant[o0]m/i.test(host)) return { level: 'danger', reason: 'resembles a trusted crypto domain but is not approved', host }
  if (/(?:connect|validate|rectify|recover|claim|airdrop|migration|support)/i.test(`${url.pathname} ${url.search}`)) return { level: 'caution', reason: 'contains wallet-lure language on an unverified domain', host }
  return { level: 'unverified', reason: 'is not in the MADGER trusted-domain registry', host }
}

export function moderationReason(text, options = {}) {
  const value = String(text ?? '')
  if (isSuspiciousMadgerMessage(value)) return 'unverified MADGER contract address'

  const credential = /(?:send|share|enter|provide|paste|submit|dm|message).{0,45}(?:seed phrase|recovery phrase|private key|secret key)|(?:seed phrase|recovery phrase|private key|secret key).{0,45}(?:send|share|enter|provide|paste|submit|dm|message)/i
  const safetyEducation = /(?:never|do\s+not|don't)\s+(?:send|share|enter|provide|paste|submit).{0,45}(?:seed phrase|recovery phrase|private key|secret key)/i
  if (credential.test(value) && !safetyEducation.test(value)) return 'wallet credential solicitation'

  const hosts = extractHttpHosts(value)
  const hasUntrustedLink = hosts.some(host => !TRUSTED_HOSTS.has(host))
  const walletLure = /(?:connect|validate|synchroni[sz]e|rectify|restore|authenticate|verify).{0,30}wallet|wallet.{0,30}(?:connect|validate|synchroni[sz]e|rectify|restore|authenticate|verify)/i
  if (hasUntrustedLink && walletLure.test(value)) return 'unverified wallet-connect link'

  const claimLure = /(?:claim|airdrop|presale|migration|double|bonus|giveaway).{0,50}(?:token|coin|crypto|wallet|madger|\$madger)/i
  if (hosts.some(host => SHORTENER_HOSTS.has(host)) && claimLure.test(value)) return 'obscured crypto promotion link'

  const impersonation = /(?:official\s+)?(?:admin|support|moderator|help\s*desk).{0,45}(?:dm|message|contact|inbox)\s+(?:me|us)|(?:dm|message|contact|inbox)\s+(?:me|us).{0,45}(?:admin|support|moderator|help\s*desk)/i
  if (impersonation.test(value) && (hasUntrustedLink || /@[A-Za-z0-9_]{5,}/.test(value))) return 'admin/support impersonation'

  if (options.strictLinks && hosts.some(host => !RAID_SHIELD_LINK_HOSTS.has(host))) return 'external link blocked during Raid Shield'

  return null
}

export function normalizedMessageFingerprint(text) {
  return String(text ?? '').toLowerCase().replace(/https?:\/\/\S+/g, '<url>').replace(/\s+/g, ' ').trim().slice(0, 500)
}

export function moderationEscalation(warningCount) {
  const count = Number(warningCount)
  if (count >= 3) return 'remove'
  if (count === 2) return 'mute'
  return 'warn'
}

const TEAM_TARGET_HOSTS = new Set([
  'madgercoin.com', 'www.madgercoin.com', 'x.com', 'twitter.com', 't.me',
  'telegram.me', 'instagram.com', 'www.instagram.com', 'facebook.com',
  'www.facebook.com', 'tiktok.com', 'www.tiktok.com', 'reddit.com',
  'www.reddit.com', 'youtube.com', 'www.youtube.com'
])

export function normalizeTeam(value) {
  const team = String(value ?? '').trim().toLowerCase()
  if (team === 'raid') return 'raid'
  if (team === 'shill' || team === 'outreach') return 'outreach'
  return null
}

export function parseTeamAlert(value) {
  const [head, ...briefParts] = String(value ?? '').split('|')
  const [teamValue, urlValue] = head.trim().split(/\s+/, 2)
  const team = normalizeTeam(teamValue)
  let url
  try { url = new URL(urlValue) } catch { return null }
  const brief = briefParts.join('|').trim()
  if (!team || url.protocol !== 'https:' || !TEAM_TARGET_HOSTS.has(url.hostname.toLowerCase())) return null
  if (brief.length < 5 || brief.length > 500) return null
  return { team, url: url.href, brief }
}

export function parseAnnouncement(value) {
  const [textValue, urlValue = '', labelValue = 'Open official link'] = String(value ?? '').split('|').map(part => part.trim())
  if (textValue.length < 5 || textValue.length > 1000) return null
  if (!urlValue) return { text: textValue, url: null, label: null }
  let url
  try { url = new URL(urlValue) } catch { return null }
  const label = labelValue || 'Open official link'
  if (url.protocol !== 'https:' || !TEAM_TARGET_HOSTS.has(url.hostname.toLowerCase()) || label.length > 40) return null
  return { text: textValue, url: url.href, label }
}

export function parseTransactionReference(value) {
  const raw = String(value ?? '').trim()
  if (/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(raw)) return raw
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !['solscan.io', 'www.solscan.io', 'explorer.solana.com'].includes(url.hostname.toLowerCase())) return null
    const candidate = url.pathname.match(/^\/tx\/([1-9A-HJ-NP-Za-km-z]{64,88})\/?$/)?.[1]
    return /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(candidate ?? '') ? candidate : null
  } catch { return null }
}

export function parseAlertSubscription(value) {
  const [metricValue = '', directionValue = '', thresholdValue = ''] = String(value ?? '').trim().toLowerCase().split(/\s+/)
  const metric = metricValue === 'volume' ? 'volume24h' : metricValue
  const direction = directionValue
  const threshold = Number(String(thresholdValue).replace(/[$,]/g, ''))
  if (!['price', 'liquidity', 'volume24h', 'holders', 'whale'].includes(metric)) return null
  if (!['above', 'below'].includes(direction) || !Number.isFinite(threshold) || threshold <= 0) return null
  return { metric, direction, threshold }
}

function tokenSymbol(mint) {
  if (mint === WRAPPED_SOL_MINT) return 'SOL'
  if (mint === USDC_MINT) return 'USDC'
  return `${String(mint).slice(0, 4)}…${String(mint).slice(-4)}`
}

export function classifyMadgerTransaction(transaction) {
  if (!transaction?.meta) return { status: 'unavailable', category: 'unavailable', verifiedPool: false, events: [] }
  const feeSol = Number(transaction.meta.fee ?? 0) / 1e9
  if (transaction.meta.err) return { status: 'failed', category: 'failed', verifiedPool: false, feeSol, events: [] }
  const rawAccountKeys = transaction.transaction?.message?.accountKeys ?? []
  const accountKeys = rawAccountKeys.map(key => String(key?.pubkey ?? key))
  const signers = new Set(rawAccountKeys.filter(key => key && typeof key === 'object' && key.signer === true).map(key => String(key.pubkey)))
  const verifiedPool = accountKeys.includes(OFFICIAL_POOL) && accountKeys.includes(RAYDIUM_CPMM_PROGRAM)

  const balances = new Map()
  const apply = (entries, direction) => {
    for (const entry of entries ?? []) {
      if (!entry.owner || !entry.mint) continue
      const key = `${entry.owner}:${entry.mint}`
      const amount = Number(entry.uiTokenAmount?.uiAmountString ?? entry.uiTokenAmount?.uiAmount ?? 0)
      balances.set(key, (balances.get(key) ?? 0) + direction * amount)
    }
  }
  apply(transaction.meta.preTokenBalances, -1)
  apply(transaction.meta.postTokenBalances, 1)

  const protectedAddresses = new Set([
    ...PROJECT_WALLETS.map(item => item.address),
    ...LOCK_RECORDS.map(item => item.address)
  ])
  const events = []
  for (const [key, amount] of balances) {
    const separator = key.indexOf(':')
    const owner = key.slice(0, separator)
    const mint = key.slice(separator + 1)
    if (mint !== OFFICIAL_MINT || Math.abs(amount) < 1e-9) continue
    const otherTokens = [...balances]
      .filter(([otherKey, delta]) => otherKey.startsWith(`${owner}:`) && !otherKey.endsWith(`:${OFFICIAL_MINT}`) && Math.abs(delta) > 1e-12)
      .map(([otherKey, delta]) => ({ mint: otherKey.slice(otherKey.indexOf(':') + 1), delta }))
    const ownerIndex = accountKeys.indexOf(owner)
    const nativeDelta = ownerIndex >= 0
      ? (Number(transaction.meta.postBalances?.[ownerIndex] ?? 0) - Number(transaction.meta.preBalances?.[ownerIndex] ?? 0)
        + (ownerIndex === 0 ? Number(transaction.meta.fee ?? 0) : 0)) / 1e9
      : 0
    const tokenPayments = otherTokens.filter(item => amount > 0 ? item.delta < 0 : item.delta > 0)
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    const liquidityTokens = otherTokens.filter(item => amount > 0 ? item.delta > 0 : item.delta < 0)
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    const nativePayment = Math.abs(nativeDelta) > 0.000001 && (amount > 0 ? nativeDelta < 0 : nativeDelta > 0)
      ? { mint: WRAPPED_SOL_MINT, delta: nativeDelta }
      : null
    const payment = tokenPayments[0] ?? nativePayment
    const liquidityAsset = liquidityTokens[0] ?? null
    const actorSigned = signers.has(owner)
    let category = amount > 0 ? 'transfer_in' : 'transfer_out'
    if (protectedAddresses.has(owner)) category = 'protected_wallet_movement'
    else if (verifiedPool && actorSigned && payment) category = amount > 0 ? 'buy' : 'sell'
    else if (verifiedPool && actorSigned && liquidityAsset) category = amount > 0 ? 'liquidity_remove' : 'liquidity_add'
    const counterAsset = category.startsWith('liquidity_') ? liquidityAsset : payment
    const postEntry = (transaction.meta.postTokenBalances ?? []).find(entry => entry.owner === owner && entry.mint === OFFICIAL_MINT)
    events.push({
      category, actor: owner, madgerAmount: Math.abs(amount), madgerDelta: amount,
      paymentAmount: counterAsset ? Math.abs(counterAsset.delta) : null,
      paymentMint: counterAsset?.mint ?? null, paymentSymbol: counterAsset ? tokenSymbol(counterAsset.mint) : null,
      postMadgerBalance: Number(postEntry?.uiTokenAmount?.uiAmountString ?? postEntry?.uiTokenAmount?.uiAmount ?? 0),
      feeSol, actorSigned
    })
  }
  const priority = ['protected_wallet_movement', 'buy', 'sell', 'liquidity_add', 'liquidity_remove', 'transfer_in', 'transfer_out']
  events.sort((left, right) => priority.indexOf(left.category) - priority.indexOf(right.category) || right.madgerAmount - left.madgerAmount)
  return {
    status: 'confirmed', category: events[0]?.category ?? 'unrelated', verifiedPool,
    feeSol, slot: transaction.slot ?? null, blockTime: transaction.blockTime ?? null, events
  }
}

export function findVerifiedMadgerBuyers(transaction) {
  return classifyMadgerTransaction(transaction).events
    .filter(event => event.category === 'buy')
    .map(event => ({ buyer: event.actor, amount: event.madgerAmount }))
    .sort((left, right) => right.amount - left.amount)
}

export function shouldActivateRaidMode(recentJoins, incomingJoins, threshold = 8) {
  const recent = Math.max(0, Number(recentJoins) || 0)
  const incoming = Math.max(0, Number(incomingJoins) || 0)
  const limit = Math.max(2, Number(threshold) || 8)
  return recent + incoming >= limit
}

export function parseRaidMode(value, now = Date.now()) {
  const until = typeof value === 'string' ? value : value?.until
  const expiresAt = Date.parse(String(until ?? ''))
  return {
    active: Number.isFinite(expiresAt) && expiresAt > now,
    until: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null,
    source: typeof value === 'object' && value?.source ? String(value.source) : null
  }
}

export function marketSnapshotSummary(snapshot, now = Date.now()) {
  const number = value => value === null || value === undefined || value === ''
    ? null
    : Number.isFinite(Number(value)) ? Number(value) : null
  const createdAt = Date.parse(String(snapshot?.created_at ?? ''))
  return {
    priceUsd: number(snapshot?.price_usd),
    liquidityUsd: number(snapshot?.liquidity_usd),
    volumeM5Usd: number(snapshot?.volume_m5_usd),
    buysM5: number(snapshot?.buys_m5),
    sellsM5: number(snapshot?.sells_m5),
    marketCapUsd: number(snapshot?.raw?.marketCap ?? snapshot?.raw?.fdv),
    ageMinutes: Number.isFinite(createdAt) ? Math.max(0, Math.floor((now - createdAt) / 60000)) : null
  }
}

export function poolSnapshotSummary(snapshot, previous = null, now = Date.now()) {
  const latest = marketSnapshotSummary(snapshot, now)
  const number = value => value === null || value === undefined || value === ''
    ? null
    : Number.isFinite(Number(value)) ? Number(value) : null
  const priorLiquidity = number(previous?.liquidity_usd)
  const pairCreatedAt = number(snapshot?.raw?.pairCreatedAt)
  return {
    ...latest,
    liquidityChangePercentage: latest.liquidityUsd !== null && priorLiquidity !== null && priorLiquidity > 0
      ? (latest.liquidityUsd - priorLiquidity) / priorLiquidity * 100
      : null,
    liquidityToMarketCapPercentage: latest.liquidityUsd !== null && latest.marketCapUsd !== null && latest.marketCapUsd > 0
      ? latest.liquidityUsd / latest.marketCapUsd * 100
      : null,
    volumeH24Usd: number(snapshot?.raw?.volume?.h24),
    buysH24: number(snapshot?.raw?.txns?.h24?.buys),
    sellsH24: number(snapshot?.raw?.txns?.h24?.sells),
    priceChangeH24Percentage: number(snapshot?.raw?.priceChange?.h24),
    dexId: String(snapshot?.raw?.dexId ?? ''),
    poolLabel: Array.isArray(snapshot?.raw?.labels) ? snapshot.raw.labels.map(String).join(', ') : '',
    pairAgeDays: pairCreatedAt !== null && pairCreatedAt > 0
      ? Math.max(0, Math.floor((now - pairCreatedAt) / 86400000))
      : null
  }
}

export function faqIntent(text) {
  const value = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!value || value.length > 180 || value.startsWith('/')) return null
  if (/^(?:what(?:'s| is) (?:the )?)?(?:madger |\$madger )?(?:price|market cap|mc)\??$/.test(value)
    || /^(?:price|market cap) of (?:madger|\$madger)\??$/.test(value)) return 'price'
  if (/^(?:what(?:'s| is) (?:the )?)?(?:madger |\$madger )?(?:liquidity|pool|pool status|liquidity status)\??$/.test(value)) return 'pool'
  if (/^(?:what(?:'s| is) (?:the )?)?(?:madger |\$madger )?(?:risk|risk report|risk snapshot)\??$/.test(value)) return 'risk'
  if (/^(?:what(?:'s| is) (?:the )?)?(?:madger |\$madger )?(?:ca|contract|contract address|mint|mint address)\??$/.test(value)) return 'contract'
  if (/^(?:how|where) (?:do|can|could|should)?\s*(?:i|we)?\s*(?:buy|get|purchase) (?:madger|\$madger)(?: safely)?\??$/.test(value)
    || /^where (?:is|can i find) (?:madger|\$madger)\??$/.test(value)) return 'buy'
  if (/^(?:what|where) (?:are|is|can i find) (?:the )?(?:official|verified) (?:madger )?(?:links?|website|site)\??$/.test(value)) return 'links'
  return null
}

export function buyTier(usdValue) {
  const value = Number(usdValue)
  if (value >= 500) return { label: 'WHALE IN THE BURROW', emoji: '🐋', instant: true }
  if (value >= 250) return { label: 'HEAVY CLAW', emoji: '🦡', instant: true }
  if (value >= 100) return { label: 'BURROW BUY', emoji: '⚡', instant: true }
  if (value >= 25) return { label: 'CLAW TAP', emoji: '⛏️', instant: true }
  return { label: 'BURROW ACTIVITY', emoji: '🟡', instant: true }
}

export function compactWallet(value) {
  const wallet = String(value ?? '').trim()
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return 'unavailable'
  return `${wallet.slice(0, 5)}…${wallet.slice(-5)}`
}

export function parseSolanaAddress(value) {
  const address = String(value ?? '').trim()
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return null
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const bytes = [0]
  for (const character of address) {
    let carry = alphabet.indexOf(character)
    if (carry < 0) return null
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58
      bytes[index] = carry & 255
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 255)
      carry >>= 8
    }
  }
  for (let index = 0; index < address.length - 1 && address[index] === '1'; index += 1) bytes.push(0)
  return bytes.length === 32 ? address : null
}

export function classifyKnownAddress(address, wallets = PROJECT_WALLETS, locks = LOCK_RECORDS) {
  if (address === OFFICIAL_POOL) return { kind: 'official_pool', label: 'Official Raydium pool' }
  const wallet = wallets.find(item => item.address === address)
  if (wallet) return { kind: 'project_wallet', label: wallet.role }
  const lock = locks.find(item => item.address === address)
  if (lock) return { kind: 'verified_lock', label: `${lock.label} · ${lock.provider}` }
  return { kind: 'unclassified', label: 'Unclassified public address' }
}

export function summarizeMintAccount(address, accountResult, supplyResult) {
  const account = accountResult?.value ?? null
  const parsed = account?.data?.parsed
  const info = parsed?.info ?? {}
  const isMint = account?.owner === SPL_TOKEN_PROGRAM && parsed?.type === 'mint'
  const rawSupply = supplyResult?.value?.uiAmountString ?? supplyResult?.value?.uiAmount ?? info.supply
  const supply = Number(rawSupply)
  const decimals = Number(supplyResult?.value?.decimals ?? info.decimals)
  return {
    exists: Boolean(account), isMint, isOfficial: address === OFFICIAL_MINT,
    ownerProgram: account?.owner ?? null,
    supply: Number.isFinite(supply) ? supply : null,
    decimals: Number.isInteger(decimals) && decimals >= 0 ? decimals : null,
    initialized: isMint ? info.isInitialized === true : false,
    mintAuthority: isMint ? info.mintAuthority ?? null : null,
    freezeAuthority: isMint ? info.freezeAuthority ?? null : null
  }
}

export function sampleMarketHistory(rows, maximum = 96) {
  const clean = (rows ?? []).map(row => ({
    priceUsd: Number(row.price_usd), liquidityUsd: Number(row.liquidity_usd),
    createdAt: String(row.created_at ?? '')
  })).filter(row => Number.isFinite(row.priceUsd) && row.priceUsd >= 0
    && Number.isFinite(row.liquidityUsd) && row.liquidityUsd >= 0
    && Number.isFinite(Date.parse(row.createdAt)))
  const limit = Math.max(2, Math.floor(Number(maximum) || 96))
  if (clean.length <= limit) return clean
  const sampled = []
  for (let index = 0; index < limit; index += 1) sampled.push(clean[Math.round(index * (clean.length - 1) / (limit - 1))])
  return sampled
}

export function pendingSignatures(signatures, checkpoint, maximum = 100) {
  const clean = (signatures ?? []).filter(item => item?.signature && !item.err)
  const checkpointIndex = clean.findIndex(item => item.signature === checkpoint)
  const newestFirst = checkpointIndex >= 0 ? clean.slice(0, checkpointIndex) : clean.slice(0, Math.max(1, maximum))
  return {
    items: newestFirst.reverse(),
    checkpointFound: checkpointIndex >= 0,
    truncated: checkpointIndex < 0 && clean.length > Math.max(1, maximum)
  }
}

export function holderSnapshotFromAccounts(accounts, totalSupply) {
  const supply = Math.max(0, Number(totalSupply) || 0)
  const balances = new Map()
  for (const entry of accounts ?? []) {
    const info = entry?.account?.data?.parsed?.info
    const owner = String(info?.owner ?? '')
    const amount = Number(info?.tokenAmount?.uiAmountString ?? info?.tokenAmount?.uiAmount ?? 0)
    if (!owner || !Number.isFinite(amount) || amount <= 0) continue
    balances.set(owner, (balances.get(owner) ?? 0) + amount)
  }
  const owners = [...balances].map(([owner, amount]) => ({
    owner, amount, percentage: supply > 0 ? amount / supply * 100 : 0
  })).sort((left, right) => right.amount - left.amount)
  return {
    holderCount: owners.length,
    totalSupply: supply,
    largestPercentage: Math.min(100, owners[0]?.percentage ?? 0),
    top10Percentage: Math.min(100, owners.slice(0, 10).reduce((sum, item) => sum + item.percentage, 0)),
    owners
  }
}

export function significantHolderMovements(current, previous, options = {}) {
  if (!previous?.owners?.length || !(Number(current?.totalSupply) > 0)) return []
  const prior = new Map(previous.owners.map(item => [item.owner, Number(item.amount) || 0]))
  const next = new Map((current.owners ?? []).map(item => [item.owner, Number(item.amount) || 0]))
  const minimumPercentage = Math.max(0, Number(options.minimumSupplyPercentage) || 0.25)
  const minimumUsd = Math.max(0, Number(options.minimumUsd) || 1000)
  const priceUsd = Math.max(0, Number(options.priceUsd) || 0)
  return [...new Set([...prior.keys(), ...next.keys()])].map(owner => {
    const previousAmount = prior.get(owner) ?? 0
    const currentAmount = next.get(owner) ?? 0
    const delta = currentAmount - previousAmount
    return {
      owner, previousAmount, currentAmount, delta,
      supplyPercentage: Math.abs(delta) / current.totalSupply * 100,
      approximateUsd: Math.abs(delta) * priceUsd
    }
  }).filter(item => item.supplyPercentage >= minimumPercentage || (priceUsd > 0 && item.approximateUsd >= minimumUsd))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
}

export function classifiedDistribution(snapshot, wallets = PROJECT_WALLETS, locks = LOCK_RECORDS) {
  const supply = Math.max(0, Number(snapshot?.totalSupply) || 0)
  const owners = new Map((snapshot?.owners ?? []).map(item => [item.owner, Number(item.amount) || 0]))
  const rows = wallets.map(wallet => {
    const amount = owners.get(wallet.address) ?? 0
    return { ...wallet, amount, percentage: supply > 0 ? amount / supply * 100 : 0, kind: 'project' }
  })
  for (const lock of locks.filter(item => item.asset === 'MADGER')) {
    const amount = owners.get(lock.address) ?? 0
    rows.push({ ...lock, role: `${lock.label} lock`, amount, percentage: supply > 0 ? amount / supply * 100 : 0, kind: 'lock' })
  }
  const classifiedAmount = rows.reduce((sum, row) => sum + row.amount, 0)
  return {
    rows,
    classifiedAmount,
    classifiedPercentage: supply > 0 ? Math.min(100, classifiedAmount / supply * 100) : 0,
    unclassifiedAmount: Math.max(0, supply - classifiedAmount),
    unclassifiedPercentage: supply > 0 ? Math.max(0, (supply - classifiedAmount) / supply * 100) : 0
  }
}

export function protectedWalletMovements(current, previous, wallets = PROJECT_WALLETS, locks = LOCK_RECORDS, options = {}) {
  if (!previous?.owners?.length) return []
  const protectedRows = [...wallets.map(item => ({ ...item, label: item.role })), ...locks.filter(item => item.asset === 'MADGER')]
  const currentOwners = new Map((current?.owners ?? []).map(item => [item.owner, Number(item.amount) || 0]))
  const priorOwners = new Map(previous.owners.map(item => [item.owner, Number(item.amount) || 0]))
  const minimumOutbound = Math.max(0, Number(options.minimumOutbound) || 1000)
  const minimumInbound = Math.max(0, Number(options.minimumInbound) || 10000)
  return protectedRows.map(item => {
    const previousAmount = priorOwners.get(item.address) ?? 0
    const currentAmount = currentOwners.get(item.address) ?? 0
    return { ...item, previousAmount, currentAmount, delta: currentAmount - previousAmount }
  }).filter(item => item.delta <= -minimumOutbound || item.delta >= minimumInbound)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
}

export function marketAlertReasons(current, previous) {
  const reasons = []
  const currentPrice = Number(current?.priceUsd)
  const previousPrice = Number(previous?.price_usd)
  if (currentPrice > 0 && previousPrice > 0) {
    const move = ((currentPrice - previousPrice) / previousPrice) * 100
    if (Math.abs(move) >= 8) reasons.push(`15-minute price move: ${move.toFixed(1)}%`)
  }
  const currentLiquidity = Number(current?.liquidity?.usd)
  const previousLiquidity = Number(previous?.liquidity_usd)
  if (currentLiquidity >= 0 && previousLiquidity > 0) {
    const change = ((currentLiquidity - previousLiquidity) / previousLiquidity) * 100
    if (change <= -10) reasons.push(`Liquidity change: ${change.toFixed(1)}%`)
  }
  return reasons
}
