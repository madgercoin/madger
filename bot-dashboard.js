const endpoint = 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-command-bot/public-data'
const select = selector => document.querySelector(selector)
const money = value => Number.isFinite(Number(value))
  ? '$' + Number(value).toLocaleString('en-US', { maximumFractionDigits: Number(value) < 0.01 ? 10 : 2 })
  : 'Unavailable'

function chart(rows, key, pathId, rangeId) {
  const values = (rows || []).map(item => Number(item[key])).filter(Number.isFinite)
  if (values.length < 2) return
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low || 1
  const points = values.map((value, index) =>
    `${(index * 600 / (values.length - 1)).toFixed(1)},${(112 - (value - low) * 104 / span).toFixed(1)}`)
  select(pathId).setAttribute('d', `M${points.join(' L')}`)
  select(rangeId).textContent = `Low ${money(low)} · High ${money(high)} · ${values.length} verified snapshots`
}

async function loadDashboard() {
  const response = await fetch(endpoint)
  if (!response.ok) throw new Error(`Dashboard API failed: ${response.status}`)
  const data = await response.json()
  select('#price').textContent = money(data.market.priceUsd)
  select('#liquidity').textContent = money(data.market.liquidityUsd)
  select('#volume').textContent = money(data.market.volume24hUsd)
  select('#holders').textContent = Number(data.holders?.holder_count || 0).toLocaleString()
  select('#change').textContent = `${Number(data.market.priceChange24h) >= 0 ? '+' : ''}${Number(data.market.priceChange24h).toFixed(2)}%`
  select('#updated').textContent = `Updated ${data.market.ageMinutes ?? '?'}m ago`
  chart(data.history24h, 'priceUsd', '#pricepath', '#pricerange')
  chart(data.history24h, 'liquidityUsd', '#liquiditypath', '#liquidityrange')
  const status = select('#system')
  status.textContent = data.system?.operational ? 'OPERATIONAL ✓' : 'DEGRADED — CHECK /status'
  status.className = data.system?.operational ? 'ok' : 'error'
  const locks = select('#locks')
  locks.textContent = ''
  for (const item of data.locks || []) {
    const row = document.createElement('div')
    const label = document.createElement('span')
    const state = document.createElement('strong')
    row.className = 'lock'
    label.textContent = `${item.label} · ${item.provider}`
    state.className = item.intact ? 'ok' : 'error'
    state.textContent = item.intact ? 'INTACT' : 'CHECK'
    row.append(label, state)
    locks.append(row)
  }
  if (!locks.children.length) locks.textContent = 'Initializing'
}

loadDashboard().catch(() => {
  select('#price').textContent = 'Temporarily unavailable'
  select('#price').className = 'price error'
})
