export const OFFICIAL_MINT = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv'
export const OFFICIAL_POOL = 'FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h'

export const LINKS = Object.freeze({
  guide: 'https://madgercoin.com/buy',
  raydium: `https://raydium.io/liquidity-pools/?token=${OFFICIAL_MINT}`,
  dex: `https://dexscreener.com/solana/${OFFICIAL_POOL.toLowerCase()}`,
  verify: 'https://madgercoin.com/launch.html',
  official: 'https://madgercoin.com/official-links.html',
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

export function moderationReason(text) {
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

export function buyTier(usdValue) {
  const value = Number(usdValue)
  if (value >= 500) return { label: 'WHALE IN THE BURROW', emoji: '🐋', instant: true }
  if (value >= 250) return { label: 'HEAVY CLAW', emoji: '🦡', instant: true }
  if (value >= 100) return { label: 'BURROW BUY', emoji: '⚡', instant: true }
  if (value >= 25) return { label: 'CLAW TAP', emoji: '⛏️', instant: true }
  return { label: 'BURROW ACTIVITY', emoji: '🟡', instant: false }
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
