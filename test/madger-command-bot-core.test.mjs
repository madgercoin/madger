import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFICIAL_MINT, OFFICIAL_POOL, PROJECT_WALLETS, RAYDIUM_CPMM_PROGRAM, buyTier, classifiedDistribution, compactWallet, contributorRank, escapeHtml, faqIntent,
  classifyKnownAddress, classifyMadgerTransaction, findVerifiedMadgerBuyers, inspectLinkSafety, isSuspiciousMadgerMessage,
  holderSnapshotFromAccounts,
  marketAlertReasons, marketSnapshotSummary, moderationEscalation, moderationReason, poolSnapshotSummary,
  normalizeMissionCode, normalizeReferral, normalizeTeam, normalizedMessageFingerprint,
  parseAlertSubscription, parseAnnouncement, parseMissionDefinition, parseRaidMode, parseReviewRequest, parseSolanaAddress, parseTeamAlert, parseTransactionReference, pendingSignatures,
  sampleMarketHistory,
  protectedWalletMovements, shouldActivateRaidMode, significantHolderMovements
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
  assert.equal(buyTier(0).instant, true)
  assert.equal(buyTier(25).label, 'CLAW TAP')
  assert.equal(buyTier(500).label, 'WHALE IN THE BURROW')
})
test('abbreviates only valid Solana wallet addresses', () => {
  assert.equal(compactWallet(OFFICIAL_MINT), 'BHauM…XRKqv')
  assert.equal(compactWallet('not-a-wallet'), 'unavailable')
})
test('validates full 32-byte Solana addresses and classifies only published records', () => {
  assert.equal(parseSolanaAddress(OFFICIAL_MINT), OFFICIAL_MINT)
  assert.equal(parseSolanaAddress('1'.repeat(32)), '1'.repeat(32))
  assert.equal(parseSolanaAddress('not-a-wallet'), null)
  assert.deepEqual(classifyKnownAddress(OFFICIAL_POOL), { kind: 'official_pool', label: 'Official Raydium pool' })
  assert.deepEqual(classifyKnownAddress(PROJECT_WALLETS[1].address), { kind: 'project_wallet', label: 'Treasury' })
  assert.equal(classifyKnownAddress('1'.repeat(32)).kind, 'unclassified')
})
test('samples market history while preserving endpoints and rejecting invalid rows', () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({ price_usd: index, liquidity_usd: 100 + index, created_at: new Date(index * 1000).toISOString() }))
  rows.splice(4, 0, { price_usd: 'bad', liquidity_usd: 1, created_at: 'bad' })
  const sampled = sampleMarketHistory(rows, 4)
  assert.equal(sampled.length, 4)
  assert.equal(sampled[0].priceUsd, 0)
  assert.equal(sampled.at(-1).priceUsd, 9)
})
test('plans oldest-first signature catch-up without replaying the checkpoint', () => {
  const signatures = ['newest', 'middle', 'checkpoint', 'old'].map(signature => ({ signature }))
  assert.deepEqual(pendingSignatures(signatures, 'checkpoint'), {
    items: [{ signature: 'middle' }, { signature: 'newest' }],
    checkpointFound: true,
    truncated: false
  })
  const capped = pendingSignatures(signatures, 'missing', 2)
  assert.deepEqual(capped.items, [{ signature: 'middle' }, { signature: 'newest' }])
  assert.equal(capped.truncated, true)
})
test('aggregates token accounts by owner for holder intelligence', () => {
  const account = (owner, amount) => ({ account: { data: { parsed: { info: { owner, tokenAmount: { uiAmountString: String(amount) } } } } } })
  const snapshot = holderSnapshotFromAccounts([account('A', 40), account('A', 10), account('B', 25), account('zero', 0)], 100)
  assert.equal(snapshot.holderCount, 2)
  assert.equal(snapshot.largestPercentage, 50)
  assert.equal(snapshot.top10Percentage, 75)
  assert.deepEqual(snapshot.owners.map(item => [item.owner, item.amount]), [['A', 50], ['B', 25]])
})
test('labels large holder changes as movements without classifying trade direction', () => {
  const current = { totalSupply: 1000, owners: [{ owner: 'A', amount: 600 }, { owner: 'B', amount: 400 }] }
  const previous = { owners: [{ owner: 'A', amount: 500 }, { owner: 'B', amount: 500 }] }
  const movements = significantHolderMovements(current, previous, { minimumSupplyPercentage: 5, priceUsd: 2 })
  assert.deepEqual(movements.map(item => [item.owner, item.delta]), [['A', 100], ['B', -100]])
})
test('classifies published project wallets and separates the remaining supply', () => {
  const snapshot = { totalSupply: 1000, owners: [
    { owner: PROJECT_WALLETS[0].address, amount: 600 },
    { owner: PROJECT_WALLETS[1].address, amount: 200 },
    { owner: 'unclassified', amount: 200 }
  ] }
  const result = classifiedDistribution(snapshot, PROJECT_WALLETS, [])
  assert.equal(result.rows[0].role, 'Liquidity reserve')
  assert.equal(result.classifiedAmount, 800)
  assert.equal(result.unclassifiedPercentage, 20)
})
test('alerts on protected outflows and ignores dust movements', () => {
  const wallet = PROJECT_WALLETS[0]
  const previous = { owners: [{ owner: wallet.address, amount: 100000 }] }
  const current = { owners: [{ owner: wallet.address, amount: 98000 }] }
  assert.equal(protectedWalletMovements(current, previous, [wallet], [], { minimumOutbound: 1000 }).length, 1)
  current.owners[0].amount = 99999
  assert.equal(protectedWalletMovements(current, previous, [wallet], [], { minimumOutbound: 1000 }).length, 0)
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

test('inspects links without visiting untrusted destinations', () => {
  assert.equal(inspectLinkSafety('https://madgercoin.com/buy').level, 'trusted')
  assert.equal(inspectLinkSafety('http://madgercoin.com').level, 'danger')
  assert.equal(inspectLinkSafety('https://madger-support.example/connect').level, 'danger')
  assert.equal(inspectLinkSafety('https://example.com/claim-wallet').level, 'caution')
  assert.equal(inspectLinkSafety('not a link').level, 'invalid')
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
      { pubkey: buyer, signer: true }, { pubkey: OFFICIAL_POOL }, { pubkey: RAYDIUM_CPMM_PROGRAM }
    ] } },
    meta: {
      err: null, fee: 5000, preBalances: [2_000_000_000, 0, 0], postBalances: [1_899_995_000, 0, 0],
      preTokenBalances: [{ owner: buyer, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '100' } }],
      postTokenBalances: [{ owner: buyer, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '150' } }]
    }
  }
  assert.deepEqual(findVerifiedMadgerBuyers(transaction), [{ buyer, amount: 50 }])
  const classified = classifyMadgerTransaction(transaction)
  assert.equal(classified.category, 'buy')
  assert.equal(classified.events[0].paymentSymbol, 'SOL')
  assert.equal(classified.events[0].paymentAmount, 0.1)
  assert.equal(classified.events[0].postMadgerBalance, 150)
})

test('classifies a verified sell from exact MADGER and SOL balance deltas', () => {
  const seller = 'Se11er1111111111111111111111111111111111111'
  const transaction = {
    slot: 99, transaction: { message: { accountKeys: [
      { pubkey: seller, signer: true }, { pubkey: OFFICIAL_POOL }, { pubkey: RAYDIUM_CPMM_PROGRAM }
    ] } },
    meta: {
      err: null, fee: 5000, preBalances: [1_000_000_000, 0, 0], postBalances: [1_199_995_000, 0, 0],
      preTokenBalances: [{ owner: seller, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '1000' } }],
      postTokenBalances: [{ owner: seller, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '750' } }]
    }
  }
  const result = classifyMadgerTransaction(transaction)
  assert.equal(result.category, 'sell')
  assert.equal(result.events[0].madgerAmount, 250)
  assert.ok(Math.abs(result.events[0].paymentAmount - 0.2) < Number.EPSILON)
  assert.deepEqual(findVerifiedMadgerBuyers(transaction), [])
})

test('parses only safe transaction references and bounded alert rules', () => {
  const signature = '1'.repeat(88)
  assert.equal(parseTransactionReference(signature), signature)
  assert.equal(parseTransactionReference(`https://solscan.io/tx/${signature}`), signature)
  assert.equal(parseTransactionReference(`https://evil.example/tx/${signature}`), null)
  assert.deepEqual(parseAlertSubscription('price above $0.002'), { metric: 'price', direction: 'above', threshold: 0.002 })
  assert.deepEqual(parseAlertSubscription('volume below 1,000'), { metric: 'volume24h', direction: 'below', threshold: 1000 })
  assert.equal(parseAlertSubscription('price around 1'), null)
})

test('classifies signed liquidity additions without calling them sells', () => {
  const provider = 'Provider11111111111111111111111111111111111'
  const transaction = {
    transaction: { message: { accountKeys: [{ pubkey: provider, signer: true }, { pubkey: OFFICIAL_POOL }, { pubkey: RAYDIUM_CPMM_PROGRAM }] } },
    meta: {
      err: null, fee: 5000, preBalances: [1_000_000_000, 0, 0], postBalances: [999_995_000, 0, 0],
      preTokenBalances: [
        { owner: provider, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '1000' } },
        { owner: provider, mint: 'So11111111111111111111111111111111111111112', uiTokenAmount: { uiAmountString: '2' } }
      ],
      postTokenBalances: [
        { owner: provider, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '800' } },
        { owner: provider, mint: 'So11111111111111111111111111111111111111112', uiTokenAmount: { uiAmountString: '1.5' } }
      ]
    }
  }
  const result = classifyMadgerTransaction(transaction)
  assert.equal(result.category, 'liquidity_add')
  assert.equal(result.events[0].paymentAmount, 0.5)
  assert.deepEqual(findVerifiedMadgerBuyers(transaction), [])
})

test('does not label an unsigned pool-touching balance change as a trade', () => {
  const owner = 'Owner1111111111111111111111111111111111111'
  const transaction = {
    transaction: { message: { accountKeys: [{ pubkey: owner }, { pubkey: OFFICIAL_POOL }, { pubkey: RAYDIUM_CPMM_PROGRAM }] } },
    meta: { err: null, fee: 5000, preBalances: [2e9, 0, 0], postBalances: [1.9e9 - 5000, 0, 0], preTokenBalances: [], postTokenBalances: [{ owner, mint: OFFICIAL_MINT, uiTokenAmount: { uiAmountString: '50' } }] }
  }
  assert.equal(classifyMadgerTransaction(transaction).category, 'transfer_in')
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

test('builds pool depth and 24-hour activity without inventing missing values', () => {
  const now = Date.parse('2026-09-12T00:00:00.000Z')
  const summary = poolSnapshotSummary({
    price_usd: '0.001', liquidity_usd: '9000', created_at: '2026-09-11T23:55:00.000Z',
    raw: { marketCap: 1000000, volume: { h24: 500 }, txns: { h24: { buys: 12, sells: 8 } },
      priceChange: { h24: 4.5 }, dexId: 'raydium', labels: ['CPMM'], pairCreatedAt: now - 10 * 86400000 }
  }, { liquidity_usd: '7500' }, now)
  assert.equal(summary.liquidityChangePercentage, 20)
  assert.ok(Math.abs(summary.liquidityToMarketCapPercentage - 0.9) < Number.EPSILON)
  assert.equal(summary.volumeH24Usd, 500)
  assert.equal(summary.buysH24, 12)
  assert.equal(summary.sellsH24, 8)
  assert.equal(summary.pairAgeDays, 10)
  assert.equal(poolSnapshotSummary({ raw: {} }).liquidityChangePercentage, null)
})

test('routes only high-confidence FAQ questions', () => {
  assert.equal(faqIntent('price'), 'price')
  assert.equal(faqIntent('PRICE'), 'price')
  assert.equal(faqIntent('ca'), 'contract')
  assert.equal(faqIntent('CA'), 'contract')
  assert.equal(faqIntent('liquidity'), 'pool')
  assert.equal(faqIntent('MADGER pool status?'), 'pool')
  assert.equal(faqIntent('risk'), 'risk')
  assert.equal(faqIntent('What is the MADGER price?'), 'price')
  assert.equal(faqIntent('What is the CA?'), 'contract')
  assert.equal(faqIntent('Where can I buy $MADGER safely?'), 'buy')
  assert.equal(faqIntent('Where are the official MADGER links?'), 'links')
  assert.equal(faqIntent('I think the price will move tomorrow'), null)
  assert.equal(faqIntent('/price'), null)
})
