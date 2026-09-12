# MADGER Command Bot

Production-ready Telegram webhook and market-intelligence service for MADGER. It provides safe purchase navigation, exact-mint verification, referral attribution, contributor missions and ranks, human-reviewed points, suspicious-address moderation, private admin statistics, DEX Screener market alerts, independently verified buy notifications, and on-chain holder intelligence.

The bot never holds funds, asks for wallet credentials, fabricates activity, executes trades, presets purchase amounts or slippage, or rewards purchases and blind engagement.

## Required secrets

Configure these in the Supabase project dashboard. Never commit them.

- `TELEGRAM_BOT_TOKEN`: token created by Telegram's official BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: a new random secret used by Telegram to sign webhook deliveries.
- `TELEGRAM_BOT_USERNAME`: bot username without `@`.
- `TELEGRAM_ADMIN_CHAT_IDS`: comma-separated numeric Telegram user IDs allowed to review submissions and view stats.
- `TELEGRAM_ADMIN_CHANNEL_ID`: private admin channel ID for market and security alerts.
- `TELEGRAM_BUY_ALERT_CHAT_ID`: public or private channel/group ID for verified buy alerts.
- `TELEGRAM_BUY_ALERT_MEDIA_URL`: optional HTTPS image override for branded buy cards; defaults to the official MADGER social artwork.
- `SOLANA_RPC_URL`: optional primary private RPC endpoint; defaults to Solana's public mainnet RPC.
- `SOLANA_RPC_FALLBACK_URL`: optional secondary RPC endpoint used automatically after timeouts or provider errors.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` to the Edge Function; a temporary `SUPABASE_SERVICE_ROLE_KEY` fallback supports legacy projects during key migration. Database tables use RLS with no public policies and explicitly deny `anon` and `authenticated` access.

## Activate

1. Apply the migration.
2. Deploy `supabase/functions/madger-command-bot` with JWT verification disabled because Telegram authenticates with `X-Telegram-Bot-Api-Secret-Token`; the function rejects unsigned webhook requests.
3. Add the bot to The Burrow and give it permission to delete malicious messages if moderation is desired.
4. Invoke the internally authenticated `/setup` route. It registers the webhook and command menu directly from the function's runtime secrets, so the bot token never needs to leave the secrets manager.
5. Run `/start`, `/verify`, `/missions`, `/referral`, and the admin-only `/stats` smoke tests.

## Verified buy alerts

The one-minute transaction watcher natively watches the exact official Raydium CPMM pool. It paginates up to 200 recent signatures, processes as many as 100 unseen transactions oldest-first, and calculates exact MADGER and payment-asset balance deltas. Verified buys, verified sells, transfers, protected-wallet movements, failures, and unrelated transactions remain distinct. First activation starts from the newest signature rather than replaying history.

Every verified buy is broadcast as a Buy Card v2 with the exact received amount, actual SOL/USDC payment delta when available, execution rate, resulting MADGER balance, transaction link, and only evidence-backed 24-hour milestones. Telegram media failures fall back to text. Verified sells are stored for private flow intelligence and never used for public wallet shaming. Pending or failed buy cards are retried for up to six hours without replaying delivered alerts.

The authenticated `/buy-alert` route remains available for compatible external sources, but it applies the same independent transaction checks and duplicate suppression.

## Market monitor

The database invokes `/watch-buys` every minute and `/monitor` every five minutes with a secret stored in Supabase Vault. Splitting the jobs keeps buy detection fast without multiplying DEX Screener traffic. The function compares only the secret's SHA-256 digest, verifies the exact official pool and mint returned by DEX Screener, records a snapshot, and alerts the private admin channel for a 15-minute price move of at least 8% or a liquidity decline of at least 10%. Each buy-watcher run records duration, scan totals, verified buys, posted cards, catch-up state, and bounded errors for the private health console. A daily retention job removes processed-update IDs after 7 days, market snapshots after 30 days, and event telemetry after 180 days.

## Holder intelligence

The database invokes `/monitor-holders` every 15 minutes. Each run queries SPL Token Program accounts for the exact official mint, combines multiple token accounts belonging to the same owner, ignores zero balances, and stores a private aggregate snapshot. `/holders` reports positive-balance wallet count, 24-hour growth, the largest-wallet share, and top-10 concentration; `/holderintel` gives administrators the ten largest on-chain owners.

Private alerts fire when wallet count changes materially or an owner balance moves by at least 0.25% of supply or approximately $1,000. These alerts always describe balance movements—not buys or sells—because transfers, treasury operations, liquidity pools, exchanges, and custodial wallets cannot be classified safely from balances alone. Holder snapshots have RLS enabled, no public grants, and 180-day retention.

## Pool and risk intelligence

`/pool` reports the exact configured Raydium pool's liquidity, 24-hour liquidity change, liquidity-to-market-cap ratio, volume, buy/sell counts, price change, age, and data freshness. `/risk` combines exact-mint and exact-pool verification with market freshness, liquidity depth, holder count, and raw concentration. Neither command assigns a “safe” score or predicts returns; both expose the measurable inputs and their limitations. High-confidence natural-language questions such as `liquidity`, `pool`, or `risk` route to the same reports.

## Wallet classification and locks

The bot classifies the five full wallet addresses published in MADGER's official allocation record: liquidity reserve, treasury, community, operations, and creator reserve. `/wallets` displays their current on-chain balances, while `/distribution` separates those balances and the verified strategic-reserve lock from other pool and holder wallets. Target allocation percentages remain reference targets and are never presented as current balances.

`/locks` monitors the Jupiter Lock strategic-reserve escrow and two documented Streamflow LP escrow token accounts. Every 15-minute holder run verifies each escrow balance. Any decrease triggers a private administrator warning, and outbound movements of at least 1,000 MADGER or inbound movements of at least 10,000 MADGER involving a published project wallet produce a separate protected-wallet alert. Alerts describe observed movements and require comparison against the authorized transaction record; they do not allege misconduct or infer trade direction.

## Commands

- `/buy` — neutral, verified purchase routes
- `/price` — latest stored price, market cap, liquidity, five-minute volume, and buy/sell counts
- `/pool` or `/liquidity` — official-pool liquidity depth, 24-hour trend, activity, and age
- `/risk` — combined verified-pool, freshness, liquidity, and raw concentration snapshot
- `/holders` — positive-balance wallet growth and ownership concentration
- `/wallets` — live balances for the five published project wallets
- `/distribution` — classified project, lock, pool, and other-holder distribution
- `/locks` — strategic-reserve and LP escrow balance monitor
- `/chart` — official-pool DEX Screener chart
- `/checktx SIGNATURE_OR_LINK` — read-only classification of a confirmed transaction as a verified buy, verified sell, transfer, protected-wallet movement, failure, or unrelated activity
- `/checklink HTTPS_URL` — analyze a link locally for trusted-domain matches, lookalikes, shorteners, raw network addresses, and wallet-lure language without visiting it
- `/alert METRIC above|below VALUE` — create a private price, liquidity, 24-hour volume, holder-count, or verified whale-flow alert
- `/alerts` and `/alertoff ID` — list or disable private alerts
- `/app` — open the branded read-only Telegram Mini App dashboard
- `/ca` or `/contract` — complete official mint and pool
- `/links` — official website, community, verification, and chart links
- `/help` — concise public command directory
- `/verify` or `/mint` — complete official mint and pool
- `/missions` — active contribution work
- `/submit CODE HTTPS_URL` — evidence for human review
- `/mywork` — private history and status of the member's five latest submissions
- `/rank` — approved contribution points and rank
- `/leaderboard` — top contributors ranked only by human-approved work
- `/referral` — attributable Telegram onboarding link
- `/whoami` — display the requesting user's numeric Telegram ID for secure admin setup
- `/chatid` — display the current group's or channel's numeric Telegram ID
- `/rules` and `/safety` — community standards and wallet-safety guidance
- `/report` — reply to suspicious content to send a private evidence record to administrators
- `/teams` — private opt-in center for Raid Team and Outreach Team alerts
- `/jointeam raid|outreach` and `/leaveteam raid|outreach` — manage voluntary notifications
- `/teamalert TEAM HTTPS_URL | BRIEF` — admin-only campaign alert, private chat only, with a 30-minute team cooldown
- `/teamstats` — admin-only opt-in counts
- `/announce MESSAGE [| HTTPS_URL | BUTTON]` — publish one official announcement to The Burrow
- `/announcepin MESSAGE [| HTTPS_URL | BUTTON]` — publish and request a Telegram notification pin
- `/dashboard` — private command-center view of joins, safety actions, teams, delivery, announcements, and market state
- `/health` — private live check of webhook delivery, market and holder freshness, one-minute buy-watcher runs, card failures, cleanup backlog, Raid Shield, and Telegram permissions
- `/modlog` — private list of the ten most recent safety and administrator actions
- `/raidmode status|on [MINUTES]|off` — private administrator control for Raid Shield
- `/purgeunverified` — remove up to 25 pending unverified accounts from The Burrow
- `/faqmode status|on|off` — private administrator control for automatic FAQ replies
- `/missionadd CODE | POINTS | TITLE | INSTRUCTIONS` — privately create a contributor mission
- `/missionclose CODE` and `/missionopen CODE` — privately pause or reactivate a mission
- `/missionlist` — private administrator view of active and closed missions
- `/reviews` — private administrator queue of the five oldest pending submissions
- `/cleanup` — reply-based administrator removal of an obsolete group message

Operational dashboards and team statistics are direct-message only. If invoked in a group, MADGERbot deletes the command and sends the result path privately to the authorized administrator.
Telegram receives a public command menu without administrator operations. Each configured administrator receives a private command scope containing the complete public and admin toolset.
- `/warn`, `/mute [MINUTES]`, and `/ban` — reply-based administrator moderation
- `/unmute` and `/clearwarns` — reply-based recovery controls
- `/memberinfo` — reply-based private inspection of verification, restriction, warning, flood, and repeat-message state
- `/stats` — admin-only seven-day report
- `/buypreview` — private administrator preview of the exact branded buy-card layout without creating or publishing a fake buy
- `/buystats` — private 24-hour and seven-day verified-buy volume and delivery report
- `/retrycards` — retry up to ten failed or pending buy cards from the prior six hours without replaying delivered cards
- `/sellstats` or `/flow` — private 24-hour verified buy/sell ratio and net-flow report
- `/daily` — generate the admin briefing on demand; the same report is delivered automatically each day at 13:00 UTC
- `/holderintel` — private largest-wallet and concentration console
- `/approve ID [NOTE]` and `/reject ID [NOTE]` — admin-only human review

Inline sharing is implemented for the official mint, current market snapshot, safety standard, and verified purchase guide. Telegram's BotFather inline mode must be enabled once before members can invoke `@MADGERcoin_bot` in another chat. The Mini App exposes only aggregate market, holder, and lock health data; it has no wallet connector, signing code, custody, or trading execution.

Trade labels require the exact mint, exact official pool, Raydium CPMM program, matching payment-asset deltas, and signer proof from the affected wallet. Same-direction MADGER and counter-asset changes are classified as liquidity additions or removals rather than buys or sells. A five-minute watchdog checks watcher, market, and holder freshness and attempts one bounded recovery action per run; it never signs transactions or touches wallets.

## Community Guard

- New human members receive a branded welcome and must pass a one-tap challenge within 10 minutes before posting.
- Eight joins within 60 seconds automatically activate Raid Shield for 30 minutes, shorten all pending and new verification windows to three minutes, and alert the administrator privately.
- While Raid Shield is active, non-administrator links are locked to the official MADGER website, Raydium, DEX Screener, and Solscan. Existing scam-specific filtering remains active at all times.
- Manual Raid Shield windows can run for 5–180 minutes. Expiry restores the standard verification flow without changing the group's default permissions.
- High-confidence wallet credential requests, admin impersonation, unverified wallet-connect links, and fake MADGER contract addresses are removed.
- Flooding and repeated-message spam escalate from warning to temporary mute to removal. Administrators are exempt.
- Credential theft and admin impersonation attempts are removed immediately and reported privately.
- `/report` records the reporter, reported user, message ID, and a bounded excerpt for administrator review.
- Manual warnings, mutes, bans, unmutes, warning resets, cleanups, reports, and automatic guard actions produce bounded private audit events.

## Promotion teams

- The Raid Team receives approved MADGER post alerts for authentic, original participation.
- The Outreach Team is the transparent alternative to mass “shilling”: members engage only where relevant and disclose their connection when appropriate.
- Membership is private, voluntary, and revocable at any time. The bot never tags the entire group.
- Alerts permit only trusted MADGER and major social-platform HTTPS targets, are admin-only, and have a 30-minute per-team cooldown.
- Every alert prohibits scripts, copy-paste swarms, spam, harassment, misleading claims, and financial promises.

## Contributor missions

- The public leaderboard includes only members with human-approved contribution points and never exposes numeric Telegram IDs.
- Members without a public Telegram username appear as anonymous contributors.
- Mission creation is administrator-only and direct-message-only. Codes, points, titles, and instructions are strictly bounded.
- Missions that reward purchases, holdings, transfers, wallet connections, mass-tagging, spam, harassment, or guaranteed returns are rejected.
- Closing a mission preserves its history and submissions; reopening restores it without rewriting prior records.
- Member submission history and administrator review queues are direct-message-only. Evidence links are limited to 500 characters and review notes to 300 characters.

## Announcements and cleanup

- Admins publish from the private bot chat; the destination is fixed to the configured Burrow chat ID.
- Optional buttons accept only the same trusted MADGER and major social-platform HTTPS targets as team alerts.
- Pin requests use Telegram's native notification pin and fail safely if the bot lacks pin permission.
- Completed join notices and moderation notices are automatically removed after five minutes during the existing monitor cycle.
- Group mission lists are live snapshots that expire after 15 minutes, preventing closed or deleted work from remaining visibly active.
- Replying to any obsolete group message with `/cleanup` removes the target, deletes the command, records an administrator audit event, and removes the confirmation after one minute.

## Automatic FAQ responder

- High-confidence natural-language questions about price, market cap, the official contract, buying routes, and official links receive the same verified answers as the matching commands.
- Each chat and topic has a three-minute cooldown, preventing repeated questions from turning the bot into noise.
- Automatic answers are removed after four minutes and recorded as aggregate operational events for the private dashboard.
- Ambiguous price discussion and ordinary conversation are ignored. Administrators can disable or restore the feature privately with `/faqmode`.

## Local verification

```sh
node --test test/core.test.mjs
node --check supabase/functions/madger-command-bot/core.js
```
