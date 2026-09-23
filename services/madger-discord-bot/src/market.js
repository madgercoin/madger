import { OFFICIAL_MINT, OFFICIAL_POOL } from './core.js'

const DEX_URL = `https://api.dexscreener.com/latest/dex/pairs/solana/${OFFICIAL_POOL}`

function number(value) {
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

export async function fetchVerifiedMarket(fetchImpl = fetch) {
  const response = await fetchImpl(DEX_URL, { headers: { accept: 'application/json', 'user-agent': 'MADGER-Discord-Bot/1.0' }, signal: AbortSignal.timeout(8_000) })
  if (!response.ok) throw new Error(`DEX Screener returned ${response.status}`)
  const payload = await response.json()
  const pair = payload?.pair ?? payload?.pairs?.[0]
  const bases = [pair?.baseToken?.address, pair?.quoteToken?.address]
  if (pair?.pairAddress !== OFFICIAL_POOL || !bases.includes(OFFICIAL_MINT)) throw new Error('DEX response did not match the official MADGER mint and pool')
  return Object.freeze({
    priceUsd: number(pair.priceUsd), marketCapUsd: number(pair.marketCap ?? pair.fdv),
    liquidityUsd: number(pair.liquidity?.usd), volume24hUsd: number(pair.volume?.h24),
    priceChange24h: number(pair.priceChange?.h24), buys24h: number(pair.txns?.h24?.buys),
    sells24h: number(pair.txns?.h24?.sells), fetchedAt: new Date().toISOString()
  })
}

export function formatUsd(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(Number(value))) return 'Unavailable'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits }).format(Number(value))
}

export function formatCompact(value) {
  if (!Number.isFinite(Number(value))) return 'Unavailable'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(value))
}
