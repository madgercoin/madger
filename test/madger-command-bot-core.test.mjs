import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFICIAL_MINT, OFFICIAL_POOL, RAYDIUM_CPMM_PROGRAM, buyTier, contributorRank, escapeHtml, faqIntent,
  findVerifiedMadgerBuyers, isSuspiciousMadgerMessage,
  marketAlertReasons, marketSnapshotSummary, moderationEscalation, moderationReason,
  normalizeMissionCode, normalizeReferral, normalizeTeam, normalizedMessageFingerprint,
  parseAnnouncement, parseMissionDefinition, parseRaidMode, parseReviewRequest, parseTeamAlert,
  shouldActivateRaidMode
} from '../supabase/functions/madger-command-bot/core.js'

test('escapes Telegram HTML', () => assert.equal(escapeHtml('<bad & worse>'), '&lt;bad &amp; worse&gt;'))
test('normalizes valid referral codes', () => {
  assert.equal(normalizeReferral('ref_Mabc_1234'), 'mabc_1234')
  assert.equal(normalizeReferral('../bad'), null)
})
test('parses bounded contributor missions and rejects financial or spam rewards', () => {
  assert.deepEqual(parseMissionDefinition('ART-WEEK | 125 | Create original MADGER art | Publish one original artwork and submit its public HTTPS link.'), {
    code: 'art-week', points: 125, title: 'Create original MADGER art',
    instructions: 'Publish one original artwork and submit its public HTTPS link.'
  })
  assert.equal(parseMissionDefinition('buyers | 500 | Reward buyers | Buy at least $50 of MADGER.'), null)
  assert.equal(parseMissionDefinition('spam | 100 | Spread this everywhere | Mass DM and tag everyone in other groups.'), null)
  assert.equal(parseMissionDefinition('wallet | 100 | Connect for points | Connect your wallet to complete this mission.'), null)
  assert.equal(normalizeMissionCode('../bad'), null)
})

test('assigns contribution ranks at exact thresholds', () => {
  assert.equal(contributorRank(99), 'Burrow Member')
  assert.equal(contributorRank(100), 'Scout')
  assert.equal(contributorRank(250), 'Claw Contributor')
  assert.equal(contributorRank(500), 'Verified Creator')
  assert.equal(contributorRank(1000), 'Burrow Elite')
})

test('parses bounded submission review requests', () => {
  assert.deepEqual(parseReviewRequest('42 Strong original work.'), { id: 42, note: 'Strong original work.' })
  assert.deepEqual(parseReviewRequest('7'), { id: 7, note: null })
  assert.equal(parseReviewRequest('0 invalid'), null)
  assert.equal(parseReviewRequest(`9 ${'x'.repeat(301)}`), null)
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

test('normalizes raid and outreach team aliases', () => {
  assert.equal(normalizeTeam('RAID'), 'raid')
  assert.equal(normalizeTeam('shill'), 'outreach')
  assert.equal(normalizeTeam('unknown'), null)
})

test('accepts bounded team alerts only on trusted community platforms', () => {
  assert.deepEqual(parseTeamAlert('raid https://x.com/madger/status/1 | Add an original comment about the artwork.'), {
    team: 'raid', url: 'https://x.com/madger/status/1', brief: 'Add an original comment about the artwork.'
  })
  assert.equal(parseTeamAlert('shill https://evil.example/connect | Paste this everywhere'), null)
  assert.equal(parseTeamAlert('raid javascript:alert(1) | Unsafe'), null)
})

test('parses plain and linked official announcements', () => {
  assert.deepEqual(parseAnnouncement('The AMA begins in ten minutes.'), {
    text: 'The AMA begins in ten minutes.', url: null, label: null
  })
  assert.deepEqual(parseAnnouncement('Join the AMA now. | https://x.com/i/spaces/1 | Enter Space'), {
    text: 'Join the AMA now.', url: 'https://x.com/i/spaces/1', label: 'Enter Space'
  })
  assert.equal(parseAnnouncement('Connect now | https://evil.example/wallet | Open'), null)
})

test('identifies a pool-touching MADGER buy with buyer payment', () => {
  const buyer = 'Buyer11111111111111111111111111111111111111'
  const transaction = {
    transaction: { message: { accountKeys: [
      { pubkey: buyer }, { pubkey: OFFICIAL_POOL }, { pubkey: RAYDIUM_CPMM_PROGRAM }
    ] } },
    meta: {
      err: null, fee: 5000, preBalances: [2_000_000_000, 0, 0], postBalances: [1_899_995_000, 0, 0],
      preTokenBalances: [{ owner: buyer, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '100' } }],
      postTokenBalances: [{ owner: buyer, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '150' } }]
    }
  }
  assert.deepEqual(findVerifiedMadgerBuyers(transaction), [{ buyer, amount: 50 }])
})

test('rejects transfers and transactions outside the official CPMM pool', () => {
  const buyer = 'Buyer11111111111111111111111111111111111111'
  const transfer = {
    transaction: { message: { accountKeys: [{ pubkey: buyer }, { pubkey: OFFICIAL_POOL }, { pubkey: RAYDIUM_CPMM_PROGRAM }] } },
    meta: {
      err: null, fee: 5000, preBalances: [2_000_000_000, 0, 0], postBalances: [1_999_995_000, 0, 0],
      preTokenBalances: [], postTokenBalances: [{ owner: buyer, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '50' } }]
    }
  }
  assert.deepEqual(findVerifiedMadgerBuyers(transfer), [])
  transfer.transaction.message.accountKeys = [{ pubkey: buyer }, { pubkey: RAYDIUM_CPMM_PROGRAM }]
  assert.deepEqual(findVerifiedMadgerBuyers(transfer), [])
})

test('activates raid mode at the configured join-burst threshold', () => {
  assert.equal(shouldActivateRaidMode(6, 2), true)
  assert.equal(shouldActivateRaidMode(5, 2), false)
  assert.equal(shouldActivateRaidMode(-10, 8), true)
})

test('parses only unexpired raid-mode windows as active', () => {
  const now = Date.parse('2026-09-11T20:00:00.000Z')
  assert.deepEqual(parseRaidMode({ until: '2026-09-11T20:30:00.000Z', source: 'automatic' }, now), {
    active: true, until: '2026-09-11T20:30:00.000Z', source: 'automatic'
  })
  assert.equal(parseRaidMode({ until: '2026-09-11T19:59:00.000Z' }, now).active, false)
  assert.equal(parseRaidMode({ until: 'invalid' }, now).active, false)
})

test('locks non-official links only while Raid Shield is strict', () => {
  const socialPost = 'See https://x.com/example/status/123'
  assert.equal(moderationReason(socialPost), null)
  assert.equal(moderationReason(socialPost, { strictLinks: true }), 'external link blocked during Raid Shield')
  assert.equal(moderationReason('Use https://madgercoin.com/buy', { strictLinks: true }), null)
})

test('normalizes a stored market snapshot for bot display', () => {
  const summary = marketSnapshotSummary({
    price_usd: '0.0012', liquidity_usd: '9000', volume_m5_usd: '42.5',
    buys_m5: 3, sells_m5: 1, raw: { marketCap: 1200000 }, created_at: '2026-09-11T20:00:00.000Z'
  }, Date.parse('2026-09-11T20:07:30.000Z'))
  assert.deepEqual(summary, {
    priceUsd: 0.0012, liquidityUsd: 9000, volumeM5Usd: 42.5,
    buysM5: 3, sellsM5: 1, marketCapUsd: 1200000, ageMinutes: 7
  })
  assert.equal(marketSnapshotSummary({ price_usd: null }).priceUsd, null)
  assert.equal(marketSnapshotSummary({ raw: {} }).marketCapUsd, null)
})

test('routes only high-confidence FAQ questions', () => {
  assert.equal(faqIntent('price'), 'price')
  assert.equal(faqIntent('PRICE'), 'price')
  assert.equal(faqIntent('ca'), 'contract')
  assert.equal(faqIntent('CA'), 'contract')
  assert.equal(faqIntent('What is the MADGER price?'), 'price')
  assert.equal(faqIntent('What is the CA?'), 'contract')
  assert.equal(faqIntent('Where can I buy $MADGER safely?'), 'buy')
  assert.equal(faqIntent('Where are the official MADGER links?'), 'links')
  assert.equal(faqIntent('I think the price will move tomorrow'), null)
  assert.equal(faqIntent('/price'), null)
})
