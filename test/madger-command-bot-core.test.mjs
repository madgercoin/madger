import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFICIAL_MINT, buyTier, escapeHtml, isSuspiciousMadgerMessage,
  marketAlertReasons, moderationEscalation, moderationReason,
  normalizeReferral, normalizedMessageFingerprint
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

test('flags high-confidence wallet scams without blocking safety education', () => {
  assert.equal(moderationReason('Admin here, DM me @fakehelp and send your seed phrase'), 'wallet credential solicitation')
  assert.equal(moderationReason('Validate your wallet at https://evil.example/connect'), 'unverified wallet-connect link')
  assert.equal(moderationReason('Never share your seed phrase with anyone.'), null)
  assert.equal(moderationReason('Read https://madgercoin.com/buy to verify MADGER.'), null)
})

test('normalizes duplicate-message fingerprints', () => {
  assert.equal(normalizedMessageFingerprint('  FREE   BUY https://one.example/x '), 'free buy <url>')
})

test('escalates repeated moderation violations', () => {
  assert.equal(moderationEscalation(1), 'warn')
  assert.equal(moderationEscalation(2), 'mute')
  assert.equal(moderationEscalation(3), 'remove')
})
