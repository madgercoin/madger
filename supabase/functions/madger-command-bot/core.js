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

