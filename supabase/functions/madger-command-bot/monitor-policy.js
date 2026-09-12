export const MONITOR_LIMITS_MINUTES = Object.freeze({
  buyWatcher: 3,
  marketMonitor: 12,
  holderMonitor: 30
})

export function ageMinutes(value, now = Date.now()) {
  const time = Date.parse(String(value ?? ''))
  return Number.isFinite(time) ? Math.max(0, (now - time) / 60000) : Number.POSITIVE_INFINITY
}

export function monitorIssues({ buyHealth, marketCreatedAt, holderHealth }, now = Date.now()) {
  const issues = []
  if (buyHealth?.error || ageMinutes(buyHealth?.last_run_at, now) > MONITOR_LIMITS_MINUTES.buyWatcher) {
    issues.push('buy_watcher')
  }
  if (ageMinutes(marketCreatedAt, now) > MONITOR_LIMITS_MINUTES.marketMonitor) {
    issues.push('market_monitor')
  }
  if (holderHealth?.error || ageMinutes(holderHealth?.last_run_at, now) > MONITOR_LIMITS_MINUTES.holderMonitor) {
    issues.push('holder_monitor')
  }
  return issues
}
