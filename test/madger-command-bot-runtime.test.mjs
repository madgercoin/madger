import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { readJsonResponse } from '../supabase/functions/madger-command-bot/http-policy.js'
import { monitorIssues } from '../supabase/functions/madger-command-bot/monitor-policy.js'
import { operationTelemetry, routeLabel, telemetrySummary } from '../supabase/functions/madger-command-bot/observability.js'
import { firstSuccessful } from '../supabase/functions/madger-command-bot/resilience.js'
import { createTelegramClient, isGroupChat, keyboard } from '../supabase/functions/madger-command-bot/telegram-client.js'
import { isDuplicateUpdateError, isWebhookAuthorized, secureStringEqual } from '../supabase/functions/madger-command-bot/webhook-policy.js'
import {
  PUBLIC_BUY_ALERT_MINIMUM_USD, buyAlertHighlights, formatBuyAlert, shouldPublishBuyAlert
} from '../supabase/functions/madger-command-bot/buy-alert-policy.js'

test('Telegram client sends JSON and returns successful API results', async () => {
  let request
  const telegram = createTelegramClient('test-token', async (url, init) => {
    request = { url, init }
    return new Response(JSON.stringify({ ok: true, result: { id: 42 } }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  })
  assert.deepEqual(await telegram('getMe', { sample: true }), { id: 42 })
  assert.equal(request.url, 'https://api.telegram.org/bottest-token/getMe')
  assert.deepEqual(JSON.parse(request.init.body), { sample: true })
})

test('Telegram client fails closed on API and malformed responses', async () => {
  const rejected = createTelegramClient('test-token', async () =>
    new Response(JSON.stringify({ ok: false, description: 'rate limited' }), { status: 429 }))
  await assert.rejects(() => rejected('sendMessage', {}), /rate limited/)
  const malformed = createTelegramClient('test-token', async () => new Response('not-json', { status: 502 }))
  await assert.rejects(() => malformed('getMe', {}), /invalid response/)
  await assert.rejects(() => createTelegramClient('')('getMe', {}), /not configured/)
})

test('Telegram helpers preserve group and keyboard behavior', () => {
  assert.equal(isGroupChat({ type: 'supergroup' }), true)
  assert.equal(isGroupChat({ type: 'private' }), false)
  assert.deepEqual(keyboard([[{ text: 'Open', url: 'https://madgercoin.com/' }]]), {
    inline_keyboard: [[{ text: 'Open', url: 'https://madgercoin.com/' }]]
  })
})

test('suppresses sub-dollar public buy alerts at the exact boundary', () => {
  assert.equal(PUBLIC_BUY_ALERT_MINIMUM_USD, 1)
  assert.equal(shouldPublishBuyAlert(0.99), false)
  assert.equal(shouldPublishBuyAlert(1), true)
  assert.equal(shouldPublishBuyAlert('25.50'), true)
  assert.equal(shouldPublishBuyAlert('unavailable'), false)
})

test('prioritizes evidence-backed 24-hour buy superlatives', () => {
  const rows = [
    { id: 1, usd_value: 0.25 },
    { id: 2, usd_value: 20 },
    { id: 3, usd_value: 50 },
    { id: 4, usd_value: 75 }
  ]
  assert.deepEqual(buyAlertHighlights(rows, 4, 75), ['🏆 LARGEST BUY — LAST 24 HOURS'])
  assert.deepEqual(buyAlertHighlights([...rows, { id: 5, usd_value: 60 }], 5, 60), ['🔥 TOP 2 BUY — LAST 24 HOURS'])
  assert.deepEqual(buyAlertHighlights(rows, 1, 0.25), [])
})

test('keeps buy cards concise and makes the purchase amount dominant', () => {
  const caption = formatBuyAlert({
    amount: 123456.78, usdValue: 250, tier: { emoji: '🦡', label: 'HEAVY CLAW' },
    paymentAmount: 1.25, paymentSymbol: 'SOL',
    highlights: ['🏆 LARGEST BUY — LAST 24 HOURS']
  })
  assert.match(caption, /💰 <b>≈\$250\.00 BUY<\/b>/)
  assert.match(caption, /🦡 <b>123,456\.78 \$MADGER PURCHASED<\/b>/)
  assert.match(caption, /LARGEST BUY — LAST 24 HOURS/)
  assert.match(caption, /Paid: 1\.25 SOL/)
  assert.doesNotMatch(caption, /Market cap|Liquidity|Buyer balance|Execution rate|Mint:/)
})

test('RPC failover recovers from a failed primary endpoint', async () => {
  const attempts = []
  const result = await firstSuccessful(['primary', 'fallback'], async endpoint => {
    attempts.push(endpoint)
    if (endpoint === 'primary') throw new Error('timeout')
    return 'healthy'
  }, 'RPC')
  assert.equal(result.value, 'healthy')
  assert.equal(result.endpoint, 'fallback')
  assert.deepEqual(attempts, ['primary', 'fallback'])
  assert.equal(result.errors.length, 1)
})

test('RPC failover reports bounded failure details when every endpoint fails', async () => {
  await assert.rejects(
    () => firstSuccessful(['one', 'two'], async endpoint => { throw new Error(endpoint + ' unavailable') }, 'RPC'),
    /RPC exhausted 2 endpoints/
  )
})

test('monitor policy detects stale and errored services without false alarms', () => {
  const now = Date.parse('2026-09-12T04:00:00.000Z')
  const fresh = {
    buyHealth: { last_run_at: '2026-09-12T03:59:00.000Z' },
    marketCreatedAt: '2026-09-12T03:55:00.000Z',
    holderHealth: { last_run_at: '2026-09-12T03:45:00.000Z' }
  }
  assert.deepEqual(monitorIssues(fresh, now), [])
  assert.deepEqual(monitorIssues({
    ...fresh,
    buyHealth: { ...fresh.buyHealth, error: 'RPC unavailable' },
    marketCreatedAt: '2026-09-12T03:40:00.000Z',
    holderHealth: { last_run_at: 'invalid' }
  }, now), ['buy_watcher', 'market_monitor', 'holder_monitor'])
})

test('structured telemetry labels routes and calculates one-hour health', () => {
  assert.equal(routeLabel('POST', '/functions/v1/madger-command-bot/watch-buys'), 'watch-buys')
  assert.equal(routeLabel('POST', '/functions/v1/madger-command-bot'), 'telegram-webhook')
  assert.equal(routeLabel('GET', '/functions/v1/madger-command-bot'), 'health')
  assert.deepEqual(operationTelemetry('monitor', 503, 12.4, 'upstream failed'), {
    event: 'madger_bot_request', route: 'monitor', status: 503,
    success: false, duration_ms: 12, error: 'upstream failed'
  })
  const summary = telemetrySummary([
    { metadata: { status: 200, success: true, duration_ms: 10 } },
    { metadata: { status: 200, success: true, duration_ms: 20 } },
    { metadata: { status: 500, success: false, duration_ms: 100 } }
  ])
  assert.deepEqual(
    { ...summary, errorRate: Number(summary.errorRate.toFixed(6)) },
    { requests: 3, errors: 1, errorRate: 33.333333, p95DurationMs: 100 }
  )
})

test('static Mini App remains read-only and uses the verified backend', async () => {
  const html = await readFile(new URL('../bot-dashboard.html', import.meta.url), 'utf8')
  const script = await readFile(new URL('../bot-dashboard.js', import.meta.url), 'utf8')
  assert.match(html, /BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv/)
  assert.match(script, /madger-command-bot\/public-data/)
  assert.match(html, /No wallet connection/)
  assert.doesNotMatch(`${html}\n${script}`, /wallet\.connect|sendTransaction|signTransaction/i)
})

test('DEX and database JSON policies fail closed during upstream outages', async () => {
  await assert.rejects(() => readJsonResponse(new Response('unavailable', { status: 503 }), 'DEX Screener request'), /503 unavailable/)
  await assert.rejects(() => readJsonResponse(new Response('not-json', { status: 200 }), 'database request'), /invalid JSON/)
  assert.equal(await readJsonResponse(new Response(null, { status: 204 }), 'database request', { allowEmpty: true }), null)
})

test('webhook authentication and deduplication fail closed', () => {
  assert.equal(secureStringEqual('secret', 'secret'), true)
  assert.equal(secureStringEqual('secret', 'Secret'), false)
  assert.equal(isWebhookAuthorized('', ''), false)
  assert.equal(isWebhookAuthorized('correct', 'correct'), true)
  assert.equal(isDuplicateUpdateError('duplicate key value violates unique constraint'), true)
  assert.equal(isDuplicateUpdateError('database unavailable'), false)
})
