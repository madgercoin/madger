# Purchase path — research, plan, and release checks

## Scope and authority

User authorized research followed by implementation on September 3, 2026. Work is based on production GitHub commit 21486b5 in an isolated checkout; the original dirty workspace and the separate private Sites journal are preserved. No trades, financial commitments, liquidity operations, ad purchases, wallet integrations, or analytics are part of this release.

## Research

- Production homepage sent prospective buyers to Raydium's liquidity-pool listing, not its swap screen.
- Raydium's public UI constructs `/swap/?inputMint=sol&outputMint=<mint>` links. SwapPanel reads these parameters before its cached pair. Sources: https://github.com/raydium-io/raydium-ui-v3-public/blob/master/src/features/Swap/Swap.tsx and https://github.com/raydium-io/raydium-ui-v3-public/blob/master/src/features/Swap/components/SwapPanel.tsx (retrieved September 3–4, 2026).
- https://docs.raydium.io/user-flows/swap explains route review, minimum received, slippage, fees, confirmation, and failure handling. We do not prescribe a trade amount or slippage percentage.
- Read-only Raydium pool API confirmed pool FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h contains WSOL and the exact MADGER mint, with MADGER decimals 6. API: https://api-v3.raydium.io/pools/info/ids?ids=FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h. Its reported liquidity was low and burnPercent was 0 at research time; these changing observations are not embedded as permanent marketing claims.

## Implementation plan

1. Preserve the current homepage, film, artwork, market record, and project disclosures.
2. Replace homepage pool-listing CTAs with direct, fixed SOL-to-MADGER swap links. Add an adjacent how-to-buy link and loss-risk notice.
3. Add `/buy` with an immediately available external swap link, complete selectable/copyable mint, beginner setup, mobile wallet-browser instructions, quote review, and troubleshooting. Explicitly distinguish a mint from a payment destination.
4. Keep market-record links for liquidity research. Add purchase-guide discovery to the official-links directory.
5. No iframes, new external scripts, wallet adapters, tracking, referral parameters, amount presets, or destination parameters supplied by visitors. User approval happens only in their wallet on Raydium.
6. Check build allowlist, metadata, navigation, destination/mint integrity, clipboard success/denial, responsive CSS constraints, and HTTP routes/security headers. A quote is not a completed swap. No wallet signing is tested.
7. Record a known-good production deployment, check production has not changed, deploy using its established Cloudflare path, and verify live outputs. Do not overwrite the separate private journal preview with the public site's older journal.

## Security and privacy review

The guide is informational and navigation-only. New links use fixed HTTPS destinations and noopener/noreferrer; there is no open redirect or query-parameter-based mint substitution. Copying uses only visible mint text. No wallet address, seed phrase, payment, identity data, analytics identifiers, or consent records are collected. A provider outage or missing quote must never be described as success. Instructions advise stopping on mismatched tokens, unexplained approvals, or unacceptable price impact; never bypass regional restrictions or repeatedly sign an uncertain transaction.

## Acceptance and boundaries

Read-only quote verification succeeded through Raydium's compute/swap-base-in endpoint using a 0.01 SOL diagnostic amount, with the exact expected pool and output mint. This was solely a test input, not a recommended spend or website preset. No transaction was constructed or submitted.

Known-good production version before release: 46173bde-1f87-4d3b-a9e7-3f1b2774ec00 (September 3, 2026). Fresh HTTP comparisons confirmed homepage, launch record, litepaper, shared stylesheet/script, official-links directory, and blog matched the GitHub baseline. Local tests use port 8794 to avoid an existing preview on port 8787. The guide is bundled in the Worker to guarantee its canonical route and headers.

- Links work without JavaScript; mint remains visible if copying fails.
- Direct route selects SOL input and official MADGER output, without amount/slippage/referrer parameters.
- Keyboard focus is visible; content wraps at narrow widths; headings and native disclosure controls are semantic.
- Existing unrelated work remains untouched. Publication must not regress current production content.
- Browser rendering and real-wallet completion are not established by HTTP/source tests; record verification limits honestly.
- Advertising eligibility and financial-promotion review are separate from this website navigation implementation.

## Concurrent-release reconciliation

The roadmap release landed during this task. The purchase change was rebased onto GitHub commit 2326522, preserving its roadmap page, PDF, homepage and auxiliary-page links, sitemap, and validation. Updated rollback target: c91bf802-f25b-4b49-9f74-19a1d2315afe. All 26 unit tests, site/roadmap/mint validation, artifact allowlist, syntax checks, and secret scan passed after reconciliation.
