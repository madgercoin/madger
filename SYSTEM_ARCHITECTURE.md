# System architecture

## Runtime model

The MADGER website remains a static Cloudflare Workers Static Assets site with no wallet connection, transaction execution, user account, or payment integration. Community operations now also use a separate Supabase service for the MADGER Command Bot; the bot does not change the website's static trust boundary.

```text
root sources -> node build.mjs -> dist/ allowlist -> Cloudflare Worker -> madgercoin.com

Telegram -> signed Edge Function webhook -> service-role-only bot tables
pg_cron -> Vault-authenticated market monitor -> DEX Screener -> private admin alerts
verified buy candidate -> Solana RPC confirmation -> thresholded Telegram alert
```

`index.html`, `litepaper.html`, and `404.html` provide documents. `styles.css` provides shared homepage presentation; auxiliary pages use inline styles. `script.js` rotates Daily Dig content by UTC day, updates the year, manages mobile navigation, and progressively enhances mint copying. Metadata files provide crawling/install behavior. `_headers` supplies security/cache headers.

## Build boundary

`build.mjs` deletes `dist/` and copies the eleven root resources plus nine approved assets centralized in `site-config.mjs`. Anything not explicitly listed is private to the repository and not deployed. Internal documentation, package metadata, tests, validation scripts, and source maps are excluded. The obsolete Astro starter and declarations were removed rather than retained as misleading dead source.

## Deployment

`wrangler.json` names `madger-badger`, points assets to `dist`, enables automatic trailing-slash handling, and uses the custom 404 page. See `README_DEPLOY.txt` and `DEPLOYMENT.md`.

The bot source lives under `supabase/functions/madger-command-bot/`; its schema and schedules live under `supabase/migrations/`. Telegram and Solana credentials are runtime secrets and never belong in the repository. The bot's tables have RLS enabled, no public policies, and explicit service-role-only access. Five-minute market polling and daily data-retention jobs are database-scheduled.

## Security and performance posture

The website minimizes attack surface and network dependencies and collects no personal data. The separate bot stores Telegram identifiers, usernames, referral attribution, mission evidence, moderation events, and market telemetry only for its stated community functions. Long-lived immutable caching applies to `/assets/*`; asset changes requiring prompt propagation need new filenames. Static does not mean risk-free: content integrity, dependency/build-chain safety, Cloudflare access, bot credentials, and mint accuracy remain critical.

## Future Decisions

Shared auxiliary styles, content tooling, staging, wallets, payments, formal bot privacy notices, data-subject request procedures, and broader trust boundaries for future dynamic services remain undecided.
