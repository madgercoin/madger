# MADGER acquisition analytics runbook

## Purpose

This runbook explains how to read MADGER's privacy-first aggregate acquisition events from Cloudflare Workers Analytics Engine and compare them with on-chain holder/market snapshots.

Dataset configured in `wrangler.json`:

`madger_acquisition_funnel`

Worker event layout:

| Column | Meaning |
|---|---|
| `index1` | constant sampling key: `madger` |
| `blob1` | event name: `campaign_entry`, `buy_page_view`, or `outbound_buy_click` |
| `blob2` | source |
| `blob3` | medium |
| `blob4` | campaign |
| `blob5` | content |
| `blob6` | route destination |
| `double1` | event count, written as `1` |

Cloudflare automatically adds `timestamp` and `_sample_interval`. Queries below use `SUM(_sample_interval * double1)` rather than raw row counts so results remain sampling-aware.

Official Cloudflare references:

- https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- https://developers.cloudflare.com/analytics/analytics-engine/sampling/
- https://developers.cloudflare.com/workers/examples/analytics-engine/

Cloudflare states that a dataset is created automatically after the Worker starts writing events. The SQL endpoint requires a Cloudflare API token with Account Analytics Read permission. Never commit the account ID or API token to this repository.

## Verify the dataset exists

```sql
SHOW TABLES
```

Do not treat absence before the first production event as a code failure; the table appears after writes begin.

## Last 24 hours — events by campaign and destination

```sql
SELECT
  blob1 AS event,
  blob2 AS source,
  blob3 AS medium,
  blob4 AS campaign,
  blob5 AS content,
  blob6 AS destination,
  SUM(_sample_interval * double1) AS events
FROM madger_acquisition_funnel
WHERE timestamp > NOW() - INTERVAL '1' DAY
GROUP BY event, source, medium, campaign, content, destination
ORDER BY events DESC
```

## Proficy 4-hour test — funnel totals

Run immediately after the campaign and again at T+12h/T+24h. Increase the time interval if the campaign started more than a day ago.

```sql
SELECT
  blob1 AS event,
  blob6 AS destination,
  SUM(_sample_interval * double1) AS events
FROM madger_acquisition_funnel
WHERE
  timestamp > NOW() - INTERVAL '1' DAY
  AND blob2 = 'proficy'
  AND blob4 = 'proficy_4h_test'
GROUP BY event, destination
ORDER BY event, events DESC
```

Interpretation:

- `campaign_entry` = visits through the fixed Proficy campaign alias.
- `buy_page_view` = buying-guide requests carrying the Proficy attribution.
- `outbound_buy_click` = selections of Raydium, Jupiter, BONKbot, or Trojan after a same-origin attributed guide visit.

A click is **not** a confirmed trade. Compare this aggregate funnel with the on-chain checkpoint report rather than claiming individual wallet attribution.

## Route mix — all sources

```sql
SELECT
  blob6 AS route,
  SUM(_sample_interval * double1) AS clicks
FROM madger_acquisition_funnel
WHERE
  timestamp > NOW() - INTERVAL '7' DAY
  AND blob1 = 'outbound_buy_click'
GROUP BY route
ORDER BY clicks DESC
```

## Telegram pinned-message funnel

```sql
SELECT
  blob1 AS event,
  blob6 AS destination,
  SUM(_sample_interval * double1) AS events
FROM madger_acquisition_funnel
WHERE
  timestamp > NOW() - INTERVAL '7' DAY
  AND blob2 = 'telegram'
  AND blob4 = 'burrow_buy_pin'
GROUP BY event, destination
ORDER BY event, events DESC
```

## Mobile-app route usage

```sql
SELECT
  blob6 AS route,
  SUM(_sample_interval * double1) AS clicks
FROM madger_acquisition_funnel
WHERE
  timestamp > NOW() - INTERVAL '7' DAY
  AND blob2 = 'madger_app'
  AND blob1 = 'outbound_buy_click'
GROUP BY route
ORDER BY clicks DESC
```

## Campaign review procedure

For each paid test:

1. Capture `pre-<campaign>` market/holder snapshot no more than 15 minutes before launch.
2. Record campaign start/end in Eastern Time and UTC.
3. Query Analytics Engine at campaign end.
4. Capture a new market/holder snapshot at campaign end.
5. Repeat at T+12h and T+24h.
6. Compare guide entries, route clicks, unique positive-balance owner changes, volume, buy/sell activity, and liquidity.
7. Separate market context from acquisition evidence. Price appreciation alone is not evidence that a campaign worked.
8. If organic activity overlapped the test, label the result ambiguous instead of over-attributing it.

## Privacy boundary

Do not modify the Worker to record wallet addresses, IP addresses, Telegram handles, names, email addresses, device IDs, advertising IDs, browser fingerprints, or persistent visitor identifiers merely to improve attribution. The current design intentionally trades individual-level attribution for lower privacy risk and simpler operations.

Cloudflare documents Analytics Engine retention as three months. If longer historical comparisons are required, preserve only aggregate campaign summaries in project reports rather than exporting visitor-level data.
