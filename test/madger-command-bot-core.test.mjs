import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFICIAL_MINT, buyTier, escapeHtml, isSuspiciousMadgerMessage,
  marketAlertReasons, normalizeReferral
} from '../supabase/functions/madger-command-bot/core.js'

test('escapes Telegram HTML', () => assert.equal(escapeHtml('<bad & worse>'), '&lt;bad &amp; worse&gt;'))
test('normalizes valid referral codes', () => {
  assert.equal(normalizeReferral('ref_Mabc_1234'), 'mabc_1234')
  assert.equal(normalizeReferral('../bad'), null)
})
test('accepts the official MADGER mint', () => assert.equal(isSuspiciousMadgerMessage(`MADGER ${OFFICIAL_MINT}`), false))
test('flags an alternate address presented as MADGER', () => assert.equal(isSuspiciousMadgerMessage('MADGER 9JnqwF5QzMtLE2BfypLzWrXWX7XsNJ8yqSwuNasupump'), true))
test('assigns honest buy tiers', () => {
  assert.equal(buyTier(24.99).instant, false)
  assert.equal(buyTier(25).label, 'CLAW TAP')
  assert.equal(buyTier(500).label, 'WHALE IN THE BURROW')
})
test('detects price and liquidity thresholds', () => {
  const reasons = marketAlertReasons({ priceUsd: '1.09', liquidity: { usd: 890 } }, { price_usd: '1', liquidity_usd: 1000 })
  assert.equal(reasons.length, 2)
})

