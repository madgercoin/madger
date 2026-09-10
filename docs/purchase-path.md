# MADGER purchase path — current architecture and release checks

## Canonical identity

- Network: Solana
- Mint: `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`
- Verified SOL–MADGER pool: `FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h`
- Canonical buying guide: `https://madgercoin.com/buy`

## User-facing hierarchy

The buying guide intentionally separates two levels of purchase routes so more choice does not make beginner onboarding worse.

### Standard Solana routes

1. **Raydium** — fixed SOL → MADGER swap route on `raydium.io`.
2. **Jupiter** — fixed SOL → MADGER route on `jup.ag`.

These are presented first. New users are directed to the step-by-step guide rather than to Telegram trading bots.

### Optional Telegram routes

3. **BONKbot** — verified token-specific deep link for `@bonkbot_bot`.
4. **Trojan** — verified token-specific deep link using Trojan's official Achilles backup, `@achilles_trojanbot`.

These are labeled for experienced Telegram traders. The guide warns that trading bots may create separate trading wallets and that exposed private keys must never be funded.

## Fixed redirect architecture

The public guide uses same-domain routes rather than scattering third-party URLs throughout campaign copy:

- `/r/raydium`
- `/r/jupiter`
- `/r/bonkbot`
- `/r/trojan`

The Cloudflare Worker maps each key to one hard-coded destination. Visitors cannot supply or override a destination URL. Unknown route keys return 404. This design preserves an auditable allowlist and prevents the route mechanism from becoming an open redirect.

Repository files under `r/` are **virtual-route markers for static validation only**. They are deliberately excluded from the production static-asset allowlist because the Worker handles `/r/*` before static assets.

## Campaign attribution

Fixed campaign aliases provide reproducible source attribution:

- `/c/proficy-4h`
- `/c/proficy-12h`
- `/c/telegram-pin`

Each alias redirects to `/buy` with controlled UTM dimensions. The Worker records aggregate events through Cloudflare Workers Analytics Engine when configured in production:

- `campaign_entry`
- `buy_page_view`
- `outbound_buy_click`

Stored dimensions are limited to short labels for event, source, medium, campaign, content, and route destination, plus an aggregate count. The MADGER acquisition dataset is intentionally designed without cookies, names, email addresses, wallet addresses, IP-address fields, advertising identifiers, browser fingerprints, or persistent user IDs.

The system therefore supports statements such as “the Proficy test produced N guide visits and M outbound route clicks,” but **not** “this click belongs to this wallet.” On-chain holder and market snapshots are compared by time window rather than joined to individual visitors.

## Market and holder snapshots

`scripts/capture-acquisition-metrics.mjs` captures:

- verified-pool price and liquidity
- market cap / FDV where supplied by the market API
- 24-hour volume and buy/sell transaction counts
- unique positive-balance SPL token owners when Solana RPC access permits the query
- positive token-account count

The workflow `.github/workflows/acquisition-metrics.yml` runs on demand, on relevant source changes, and every four hours. Reports are written under `reports/acquisition/`.

The holder metric is a wallet/account-state measurement, not a claim about unique human investors. Custodial wallets, program-controlled accounts, transfers among wallets, and other on-chain structures can affect interpretation.

## Security and safety requirements

- Never expose a user-supplied redirect destination.
- Never prescribe a purchase amount, slippage percentage, return, or price target in the website path.
- Never call routing through Jupiter, Raydium, BONKbot, or Trojan an endorsement by that provider.
- Never ask for seed phrases, private keys, wallet exports, remote access, or “verification payments.”
- Always display the complete mint in the official guide.
- Make the destination provider explicit before a user clicks.
- Preserve `noopener noreferrer` where a browser opens an external tab directly.
- Treat a quote as informational until an on-chain transaction is confirmed.
- If price impact, minimum received, token identity, or permissions are unacceptable, the user should stop rather than force execution.

## Release gate

Before paid acquisition or a major social push:

1. `npm ci`
2. `npm run build`
3. `npm run check`
4. `npm run validate`
5. `npm audit --omit=dev`
6. Confirm `/buy` displays Raydium, Jupiter, BONKbot, and Trojan in the intended hierarchy.
7. Confirm `/r/*` resolves only to the four allowlisted providers.
8. Confirm `/c/proficy-4h` and other active campaign aliases preserve their expected attribution labels.
9. Confirm the complete mint and verified pool remain consistent with the launch record and public market references.
10. Capture a fresh pre-campaign acquisition snapshot.
11. Test mobile and desktop layout, keyboard navigation, external destinations, and wallet-browser behavior without signing an unintended transaction.
12. Verify `https://madgercoin.com` production after deployment; source-code completion is not proof that Cloudflare has deployed the new Worker.

## Measurement boundary

The funnel deliberately measures **attention and route selection**, not private identity. A campaign should be evaluated using a combination of aggregate landing/route events, holder-count changes, pool liquidity, volume, and buy/sell activity. Correlation across a campaign window is useful operational evidence but is not individual-level attribution.
