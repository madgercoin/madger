import { escapeHtml } from './core.js'

export const PUBLIC_BUY_ALERT_MINIMUM_USD = 1

const ACTIVITY_MILESTONES = new Set([10, 25, 50, 100])

export function shouldPublishBuyAlert(usdValue) {
  const value = Number(usdValue)
  return Number.isFinite(value) && value >= PUBLIC_BUY_ALERT_MINIMUM_USD
}

export function buyAlertHighlights(rows, currentId, currentUsdValue) {
  const value = Number(currentUsdValue)
  if (!shouldPublishBuyAlert(value)) return []

  const eligible = (rows ?? []).filter(row => shouldPublishBuyAlert(row?.usd_value))
  const currentKey = String(currentId ?? '')
  const others = eligible.filter(row => String(row?.id ?? '') !== currentKey)
  const highlights = []
  const previousLargest = Math.max(0, ...others.map(row => Number(row.usd_value)))

  if (others.length && value > previousLargest) {
    highlights.push('🏆 LARGEST BUY — LAST 24 HOURS')
  } else if (eligible.length >= 3) {
    const rank = 1 + others.filter(row => Number(row.usd_value) > value).length
    if (rank <= 3) highlights.push(`🔥 TOP ${rank} BUY — LAST 24 HOURS`)
  }

  const position = eligible.findIndex(row => String(row?.id ?? '') === currentKey)
  const activityCount = position >= 0 ? position + 1 : eligible.length
  if (ACTIVITY_MILESTONES.has(activityCount)) {
    highlights.push(`⚡ ${activityCount} PUBLIC BUYS — LAST 24 HOURS`)
  }

  return highlights.slice(0, 2)
}

function formatUsd(value, exact) {
  const amount = Number(value)
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$0.00'
  return exact ? formatted : `≈${formatted}`
}

export function formatBuyAlert({
  amount, usdValue, tier, preview = false, paymentAmount = null, paymentSymbol = null, highlights = []
}) {
  const exactUsd = paymentSymbol === 'USDC' && Number.isFinite(Number(paymentAmount))
  const tokenAmount = Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })
  const badgeLines = highlights.map(item => `<b>${escapeHtml(item)}</b>`)
  const tierLine = tier?.label ? `${escapeHtml(tier.emoji ?? '🦡')} ${escapeHtml(tier.label)}` : ''
  const paymentLine = paymentAmount && paymentSymbol && paymentSymbol !== 'USDC'
    ? `Paid: ${Number(paymentAmount).toLocaleString('en-US', { maximumFractionDigits: 9 })} ${escapeHtml(paymentSymbol)}`
    : ''

  return [
    ...(preview ? ['<b>PREVIEW — NOT A LIVE BUY</b> 🧪', ''] : []),
    '<b>MADGER BUY</b> 🦡⚡',
    '',
    `💰 <b>${formatUsd(usdValue, exactUsd)} BUY</b>`,
    `🦡 <b>${tokenAmount} $MADGER PURCHASED</b>`,
    '',
    ...badgeLines,
    ...(tierLine ? [tierLine] : []),
    ...(paymentLine ? [paymentLine] : []),
    '',
    '✅ Verified official-pool transaction'
  ].filter((line, index, lines) => line !== '' || (index > 0 && lines[index - 1] !== '')).join('\n')
}
