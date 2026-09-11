# MADGER Command Bot

Production-ready Telegram webhook and market-intelligence service for MADGER. It provides safe purchase navigation, exact-mint verification, referral attribution, contributor missions and ranks, human-reviewed points, suspicious-address moderation, private admin statistics, DEX Screener market alerts, and independently verified buy notifications.

The bot never holds funds, asks for wallet credentials, fabricates activity, executes trades, presets purchase amounts or slippage, or rewards purchases and blind engagement.

## Required secrets

Configure these in the Supabase project dashboard. Never commit them.

- `TELEGRAM_BOT_TOKEN`: token created by Telegram's official BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: a new random secret used by Telegram to sign webhook deliveries.
- `TELEGRAM_BOT_USERNAME`: bot username without `@`.
- `TELEGRAM_ADMIN_CHAT_IDS`: comma-separated numeric Telegram user IDs allowed to review submissions and view stats.
- `TELEGRAM_ADMIN_CHANNEL_ID`: private admin channel ID for market and security alerts.
- `TELEGRAM_BUY_ALERT_CHAT_ID`: public or private channel/group ID for verified buy alerts.
- `SOLANA_RPC_URL`: optional private RPC endpoint; defaults to Solana's public mainnet RPC.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` to the Edge Function; a temporary `SUPABASE_SERVICE_ROLE_KEY` fallback supports legacy projects during key migration. Database tables use RLS with no public policies and explicitly deny `anon` and `authenticated` access.

## Activate

1. Apply the migration.
2. Deploy `supabase/functions/madger-command-bot` with JWT verification disabled because Telegram authenticates with `X-Telegram-Bot-Api-Secret-Token`; the function rejects unsigned webhook requests.
3. Add the bot to The Burrow and give it permission to delete malicious messages if moderation is desired.
4. Register the webhook with Telegram using the function URL, webhook secret, and the update types `message`, `channel_post`, and `callback_query`.
5. Run `/start`, `/verify`, `/missions`, `/referral`, and the admin-only `/stats` smoke tests.

## Verified buy alerts

POST candidate purchases to `/buy-alert` with the internal `x-madger-monitor-secret` header and JSON containing `signature`, `buyer`, and `source`. The function independently fetches the confirmed Solana transaction and only announces it when that buyer's balance of the exact official MADGER mint increased. Purchases below $25 are recorded but not broadcast individually.

## Market monitor

The database invokes `/monitor` every five minutes with a secret stored in Supabase Vault. The function compares only its SHA-256 digest, verifies the exact official pool and mint returned by DEX Screener, records a snapshot, and alerts the private admin channel for a 15-minute price move of at least 8% or a liquidity decline of at least 10%. A daily retention job removes processed-update IDs after 7 days, market snapshots after 30 days, and event telemetry after 180 days.

## Commands

- `/buy` — neutral, verified purchase routes
- `/verify` or `/mint` — complete official mint and pool
- `/missions` — active contribution work
- `/submit CODE HTTPS_URL` — evidence for human review
- `/rank` — approved contribution points and rank
- `/referral` — attributable Telegram onboarding link
- `/whoami` — display the requesting user's numeric Telegram ID for secure admin setup
- `/chatid` — display the current group's or channel's numeric Telegram ID
- `/stats` — admin-only seven-day report
- `/approve ID [NOTE]` and `/reject ID [NOTE]` — admin-only human review

## Local verification

```sh
node --test test/core.test.mjs
node --check supabase/functions/madger-command-bot/core.js
```
