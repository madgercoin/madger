export const OFFICIAL_MINT = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv'
export const OFFICIAL_POOL = 'FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h'

export const LINKS = Object.freeze({
  home: 'https://madgercoin.com/',
  buy: 'https://madgercoin.com/buy',
  launch: 'https://madgercoin.com/launch.html',
  official: 'https://madgercoin.com/official-links.html',
  chart: `https://dexscreener.com/solana/${OFFICIAL_POOL.toLowerCase()}`,
  raydium: `https://raydium.io/liquidity-pools/?token=${OFFICIAL_MINT}`,
  solscan: `https://solscan.io/token/${OFFICIAL_MINT}`,
  dashboard: 'https://madgercoin.com/bot-dashboard'
})

const TRUSTED_HOSTS = new Set([
  'madgercoin.com', 'www.madgercoin.com', 'raydium.io', 'www.raydium.io',
  'dexscreener.com', 'www.dexscreener.com', 'solscan.io', 'www.solscan.io',
  'discord.com', 'www.discord.com', 'discord.gg', 'x.com', 'twitter.com',
  't.me', 'telegram.me', 'instagram.com', 'www.instagram.com', 'youtube.com',
  'www.youtube.com', 'reddit.com', 'www.reddit.com', 'tiktok.com', 'www.tiktok.com'
])

const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 'cutt.ly', 'shorturl.at', 'rebrand.ly', 'is.gd', 'rb.gy', 'ow.ly'])

export function normalizeFingerprint(text) {
  return String(text ?? '').toLowerCase().replace(/https?:\/\/\S+/g, '<url>').replace(/\s+/g, ' ').trim().slice(0, 500)
}

export function extractHttpUrls(text) {
  return (String(text ?? '').match(/https?:\/\/[^\s<>]+/gi) ?? []).map(raw => raw.replace(/[),.!?]+$/, ''))
}

export function extractSolanaCandidates(text) {
  return String(text ?? '').match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) ?? []
}

export function inspectLink(value) {
  let url
  try { url = new URL(String(value ?? '').trim()) } catch { return { level: 'invalid', reason: 'not a valid URL', host: null } }
  const host = url.hostname.toLowerCase()
  if (url.protocol !== 'https:') return { level: 'danger', reason: 'not protected by HTTPS', host }
  if (TRUSTED_HOSTS.has(host)) return { level: 'trusted', reason: 'matches the MADGER trusted-domain registry', host }
  if (url.username || url.password) return { level: 'danger', reason: 'contains hidden URL credentials', host }
  if (/^xn--|\.xn--/.test(host)) return { level: 'danger', reason: 'can conceal an internationalized lookalike', host }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\[[0-9a-f:]+\]$/i.test(host)) return { level: 'danger', reason: 'uses a raw network address', host }
  if (SHORTENERS.has(host)) return { level: 'danger', reason: 'hides the destination behind a shortener', host }
  if (/madger|raydi[uv]m|solsc[a@]n|phant[o0]m/i.test(host)) return { level: 'danger', reason: 'resembles a trusted crypto domain but is not approved', host }
  if (/(?:connect|validate|rectify|recover|claim|airdrop|migration|support)/i.test(`${url.pathname} ${url.search}`)) {
    return { level: 'caution', reason: 'contains wallet-lure language on an unverified domain', host }
  }
  return { level: 'unverified', reason: 'is not in the MADGER trusted-domain registry', host }
}

export function moderationFinding(text, { strictLinks = false } = {}) {
  const value = String(text ?? '')
  const candidates = extractSolanaCandidates(value)
  if (/madger|\$madger/i.test(value) && candidates.some(candidate => candidate !== OFFICIAL_MINT && candidate !== OFFICIAL_POOL)) {
    return { severity: 'critical', reason: 'unverified MADGER contract address' }
  }

  const credential = /(?:send|share|enter|provide|paste|submit|dm|message).{0,45}(?:seed phrase|recovery phrase|private key|secret key)|(?:seed phrase|recovery phrase|private key|secret key).{0,45}(?:send|share|enter|provide|paste|submit|dm|message)/i
  const education = /(?:never|do\s+not|don't)\s+(?:send|share|enter|provide|paste|submit).{0,45}(?:seed phrase|recovery phrase|private key|secret key)/i
  if (credential.test(value) && !education.test(value)) return { severity: 'critical', reason: 'wallet credential solicitation' }

  const urls = extractHttpUrls(value)
  const inspections = urls.map(inspectLink)
  if (inspections.some(item => item.level === 'danger')) return { severity: 'high', reason: 'dangerous or obscured external link' }
  if (strictLinks && inspections.some(item => item.level !== 'trusted')) return { severity: 'medium', reason: 'external link blocked during Raid Shield' }

  const impersonation = /(?:official\s+)?(?:admin|support|moderator|help\s*desk).{0,45}(?:dm|message|contact|inbox)\s+(?:me|us)|(?:dm|message|contact|inbox)\s+(?:me|us).{0,45}(?:admin|support|moderator|help\s*desk)/i
  if (impersonation.test(value)) return { severity: 'high', reason: 'admin or support impersonation' }
  return null
}

export class SlidingWindowLimiter {
  constructor({ limit, windowMs }) {
    this.limit = limit
    this.windowMs = windowMs
    this.events = new Map()
  }

  hit(key, now = Date.now()) {
    const cutoff = now - this.windowMs
    const recent = (this.events.get(key) ?? []).filter(timestamp => timestamp > cutoff)
    recent.push(now)
    this.events.set(key, recent)
    return { blocked: recent.length > this.limit, count: recent.length, retryAfterMs: Math.max(0, recent[0] + this.windowMs - now) }
  }

  prune(now = Date.now()) {
    const cutoff = now - this.windowMs
    for (const [key, timestamps] of this.events) {
      const recent = timestamps.filter(timestamp => timestamp > cutoff)
      if (recent.length) this.events.set(key, recent)
      else this.events.delete(key)
    }
  }
}

export function xpForMessage({ content, hasAttachment = false, isThread = false }) {
  const length = normalizeFingerprint(content).length
  if (length < 8 && !hasAttachment) return 0
  return Math.min(25, 5 + Math.floor(length / 40) + (hasAttachment ? 4 : 0) + (isThread ? 2 : 0))
}

export function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100))
}

export function safeChannelName(value) {
  return String(value ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'member'
}

export function truncate(value, max = 1000) {
  const text = String(value ?? '')
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}
