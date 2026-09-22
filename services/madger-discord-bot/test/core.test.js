import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFICIAL_MINT, SlidingWindowLimiter, inspectLink, levelFromXp,
  moderationFinding, normalizeFingerprint, safeChannelName, xpForMessage
} from '../src/core.js'

test('official MADGER links are trusted and lookalikes are blocked', () => {
  assert.equal(inspectLink('https://madgercoin.com/launch.html').level, 'trusted')
  assert.equal(inspectLink('https://madgercoin.example/claim').level, 'danger')
  assert.equal(inspectLink('http://madgercoin.com').level, 'danger')
  assert.equal(inspectLink('https://bit.ly/example').level, 'danger')
})

test('moderation catches a fake MADGER mint but preserves the official mint', () => {
  assert.equal(moderationFinding(`Official MADGER mint: ${OFFICIAL_MINT}`), null)
  assert.equal(moderationFinding('Buy $MADGER at 4J48uQqrHEfDjvJwG3kpoQMPbsyGe5yWLmjBPDiJ4vZu').reason, 'unverified MADGER contract address')
})

test('wallet safety education is not mistaken for credential theft', () => {
  assert.equal(moderationFinding('Never share your seed phrase or private key.'), null)
  assert.equal(moderationFinding('DM me and send your seed phrase for support').severity, 'critical')
})

test('sliding window limiter blocks only after the configured limit', () => {
  const limiter = new SlidingWindowLimiter({ limit: 2, windowMs: 1000 })
  assert.equal(limiter.hit('member', 1000).blocked, false)
  assert.equal(limiter.hit('member', 1100).blocked, false)
  assert.equal(limiter.hit('member', 1200).blocked, true)
  assert.equal(limiter.hit('member', 2201).blocked, false)
})

test('leveling rewards substantive participation without runaway XP', () => {
  assert.equal(xpForMessage({ content: 'ok' }), 0)
  assert.ok(xpForMessage({ content: 'A useful answer with enough substance for the community.' }) > 0)
  assert.ok(xpForMessage({ content: 'x'.repeat(5000), hasAttachment: true }) <= 25)
  assert.equal(levelFromXp(0), 0)
  assert.equal(levelFromXp(900), 3)
})

test('normalization and ticket channel names are bounded', () => {
  assert.equal(normalizeFingerprint('Hello   WORLD https://example.com/x'), 'hello world <url>')
  assert.equal(safeChannelName('James Dean 🦡'), 'james-dean')
  assert.ok(safeChannelName('a'.repeat(100)).length <= 40)
})
