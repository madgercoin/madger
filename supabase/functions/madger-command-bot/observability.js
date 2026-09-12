const KNOWN_ROUTES = [
  'public-data', 'mini-app', 'setup', 'watch-buys', 'watchdog',
  'monitor-holders', 'monitor', 'daily-briefing', 'buy-alert'
]

export function routeLabel(method, pathname) {
  const path = String(pathname ?? '')
  if (path.includes('/go/')) return 'redirect'
  const match = KNOWN_ROUTES.find(route => path.endsWith('/' + route))
  if (match) return match
  if (String(method).toUpperCase() === 'GET') return 'health'
  return 'telegram-webhook'
}

export function operationTelemetry(route, status, durationMs, error = null) {
  const code = Number(status)
  const duration = Math.max(0, Math.round(Number(durationMs) || 0))
  return {
    event: 'madger_bot_request',
    route: String(route || 'unknown').slice(0, 50),
    status: Number.isInteger(code) ? code : 500,
    success: Number.isInteger(code) && code < 500,
    duration_ms: duration,
    ...(error ? { error: String(error).slice(0, 200) } : {})
  }
}

export function telemetrySummary(rows) {
  const records = (rows ?? []).map(row => row?.metadata ?? row).filter(Boolean)
  const durations = records.map(row => Number(row.duration_ms)).filter(Number.isFinite).sort((a, b) => a - b)
  const errors = records.filter(row => Number(row.status) >= 500 || row.success === false).length
  const p95Index = durations.length ? Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1) : -1
  return {
    requests: records.length,
    errors,
    errorRate: records.length ? errors / records.length * 100 : 0,
    p95DurationMs: p95Index >= 0 ? durations[p95Index] : null
  }
}
