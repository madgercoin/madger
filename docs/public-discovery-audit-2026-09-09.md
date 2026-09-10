# MADGER public discovery and link audit — 2026-09-09

## Scope

Audit objective: reconcile the public MADGER identity, mint, verified pool, website, community links, and purchase paths before paid acquisition. This is an evidence audit, not a claim that every search engine or listing provider has indexed the project.

Canonical identity used for every comparison:

- Name / ticker: MADGER / `$MADGER`
- Network: Solana
- Mint: `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`
- Verified SOL–MADGER pool: `FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h`
- Website: `https://madgercoin.com`
- Telegram announcements: `https://t.me/madgercoin`
- Telegram community: `https://t.me/madgerburrow`
- X: `https://x.com/madgercoin`

## Findings

| Surface | Audit status | Evidence / action |
|---|---|---|
| Official website | **Canonical source correct** | Public homepage exposes the exact mint and official social/community destinations. The repository buying guide has now been revised to expose Raydium, Jupiter, BONKbot and Trojan with explicit destination verification. |
| Live `/buy` deployment | **Deployment freshness must be rechecked** | The public crawler snapshot available during this audit still showed the previous Raydium-only guide. Source on `main` is newer. Do not start paid Proficy traffic until the production page visibly contains all four routes. |
| GeckoTerminal | **Verified / consistent** | The token URL resolves to the verified pool above. Current public page identifies MADGER, the exact pool/mint, Raydium CPMM trading, madgercoin.com, and social links for Discord, TikTok, X/Twitter, Telegram, GitHub, Instagram and Reddit. |
| GeckoTerminal market snapshot | **Baseline captured** | At audit time: approximately $0.001178 price, $1.18M market cap, $4,633.92 liquidity, 27 holders, $261.81 24h volume, 7 buys / 3 sells. These values are time-sensitive and should not be copied into permanent marketing creative. |
| Raydium | **Working purchase venue** | Existing verified pool; direct SOL → MADGER route is fixed in the site worker and the user has successfully traded through the market. |
| Jupiter | **Working route / not an endorsement** | Public market data identifies Jupiter as a place where MADGER can be traded. A fixed SOL → MADGER Jupiter route has been added to the buying guide. Routing should not be described as a formal listing endorsement. |
| BONKbot | **Verified purchase path** | User tested a successful MADGER purchase. The token-specific deep link resolves through `@bonkbot_bot`; the fixed route is now canonicalized behind `madgercoin.com/r/bonkbot`. |
| Trojan | **Verified purchase path** | User tested a successful MADGER purchase through Trojan's official Achilles backup. The fixed route is canonicalized behind `madgercoin.com/r/trojan`. |
| DEX Screener | **Official project directory points to verified pool** | Official site already links the exact pool address. Reconfirm the live DEX Screener pair page immediately before a paid campaign because crawler search did not return a fresh exact-mint result during this audit. |
| CoinMarketCap | **Not discoverable by MADGER name in connected CMC search at audit time** | CMC search returned no MADGER asset result. Do not represent CMC as live until independently observed. |
| CoinGecko | **No exact-mint result surfaced in the audit search** | Treat status as unverified/pending from this audit rather than claiming a live listing. GeckoTerminal is separate from a CoinGecko asset listing. |
| CoinScope | **No exact-mint result surfaced in the audit search** | Do not use “listed on CoinScope” in current acquisition copy unless the actual public project page is opened and reconciled. |
| CoinSniper | **No exact-mint result surfaced in the audit search** | Same rule: public URL must be independently observed before claiming the listing. |

## Public-link consistency

GeckoTerminal currently links back to `madgercoin.com` and exposes the expected project social families. Its Telegram link resolves to the official `@madgercoin` announcement channel, whose public description says MADGER is live on Solana and directs users to `madgercoin.com/launch.html` for mint/market verification.

The official website directory now contains the standard purchase guide, Raydium, Jupiter, BONKbot, Trojan, GeckoTerminal, DEX Screener and the project's major social/community destinations in one source desk. This should be treated as the canonical repair point when a third-party profile becomes stale.

## Paid-campaign stop conditions

Do not activate Proficy if any of the following is true:

1. Production `/buy` still shows the older Raydium-only page.
2. Any third-party market page resolves to a different mint or pool without a documented migration.
3. Raydium or Jupiter cannot quote the correct SOL → MADGER route.
4. A social/listing profile presents an unrecognized website or Telegram community as official.
5. Holder/liquidity baseline capture is unavailable immediately before the campaign.

## Maintenance rule

“Submitted,” “accepted,” “indexed,” and “publicly verified” are different states. Only call a listing live after opening the public page and reconciling the full mint, network, website/community links and market/pool data. Record the URL and audit date in this file when status changes.
