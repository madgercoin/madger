# Proficy Trending acquisition test — September 2026

## Purpose

Run one controlled paid-discovery experiment after the next liquidity addition is verified. The objective is to measure whether Proficy sends high-intent traffic that becomes new independent MADGER holders, not to optimize for impressions alone.

## Product and budget

**First test:** Proficy Trending only, **4 hours / $50**.

Observed public package pricing during the September 9 audit:

| Duration | Price |
|---|---:|
| 4 hours | $50 |
| 8 hours | $90 |
| 12 hours | $120 |
| 16 hours | $150 |
| 24 hours | $200 |

Proficy's public advertising page reported approximately 16,296 token scans/day, 1,170 active groups/day, 3,827 active groups/month, and roughly 14,700 placements for a 24-hour trending run at the time of review. Treat these as provider-reported reach metrics, not audited purchaser counts.

Official reference: https://www.proficy.io/advertise

## Campaign packet

- Network: **Solana**
- Token: **MADGER / $MADGER**
- Mint: `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`
- Verified pool: `FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h`
- Website: `https://madgercoin.com`
- Tracked destination for the 4-hour test: `https://madgercoin.com/c/proficy-4h`
- Reserved 12-hour destination if the first test earns a scale-up: `https://madgercoin.com/c/proficy-12h`
- Community: `https://t.me/madgerburrow`
- Announcement channel: `https://t.me/madgercoin`

## Do-not-launch gates

Do not start the paid clock until all of these are true:

1. The planned liquidity addition has confirmed on-chain.
2. The verified pool address above is unchanged, or any legitimate replacement has been independently reconciled across the launch record and market pages.
3. Raydium and Jupiter both return a usable SOL → MADGER quote for the correct mint.
4. The website's `/buy`, `/r/raydium`, `/r/jupiter`, `/r/bonkbot`, `/r/trojan`, and `/c/proficy-4h` routes are deployed and tested.
5. A fresh `pre-proficy-4h` acquisition snapshot has been captured.
6. The Burrow buying pin points to the official tracked website path.
7. No unresolved mint, pool, or impersonation discrepancy exists on a major public market profile.

## Measurement plan

Capture four checkpoints:

- **T-15 min:** immediately before booking / activation
- **T+4h:** at campaign end
- **T+12h:** follow-up after the placement disappears
- **T+24h:** final delayed-conversion check

At each checkpoint compare:

- unique positive-balance MADGER owners
- liquidity USD
- 24h volume
- 24h buys / sells
- market cap / price only as context, not as a campaign success criterion
- Proficy-attributed buy-page entries
- Proficy-attributed outbound clicks by route

## Decision rules

The first $50 is a smoke test. Use the following operational rules rather than impressions alone:

- **Scale signal:** at least 2 net new independent-looking holders during/following the window, or at least 1 net new holder plus clear Proficy-attributed outbound purchase-route activity.
- **Conversion problem:** meaningful Proficy landing traffic and route clicks but no holder growth. Do not buy a longer placement yet; inspect liquidity, price impact, page clarity, and transaction friction.
- **Traffic problem:** little or no Proficy-attributed landing traffic. Do not scale the package on the assumption that more hours will fix weak distribution.
- **Ambiguous:** organic activity overlaps the test materially. Repeat one additional 4-hour test in a different time block before concluding effectiveness.

These are experiment thresholds, not expected returns or a promise that paid exposure creates purchases.

## Attribution limitations

Website acquisition tracking is intentionally privacy-preserving and aggregate. It can show that a Proficy visitor reached the buying guide and clicked a route, and on-chain snapshots can show holder/market changes over the same window. It does not fingerprint users or prove that a specific click belongs to a specific wallet.
