# MADGER_Bot for Discord

MADGER_Bot extends the existing Telegram and market-intelligence system into the official MADGER Community Discord. It is a second transport over the same verified identity, Supabase data, contributor missions, and market records—not a competing bot or a replacement server.

## Capability package

- **Verified project intelligence:** exact official mint and pool, neutral buy guide, live price/liquidity/activity, supply, holder concentration, published wallet classifications, locks, official links, and service health.
- **Safety:** fake-MADGER-address detection, dangerous-link analysis without visiting URLs, credential-solicitation blocking, impersonation detection, edited-message scanning, anti-flood, repeat-spam detection, join-velocity Raid Shield, native Discord AutoMod synchronization, private reports, and bounded audit records.
- **Moderation:** warnings, timeouts, kick, ban, purge, slow mode, channel lock/unlock, message and member context menus, moderator logs, and human review for contribution decisions.
- **Community:** welcome and one-tap verification, quarantine and verified roles, opt-in roles, XP with a one-minute cooldown, contribution points kept separate from chat activity, profiles, ranks, leaderboards, missions, evidence submissions, referrals, suggestions, polls, and starboard-ready reaction access.
- **Support and operations:** private tickets, FAQ routing, announcements, command center, health and permission checks, least-privilege setup audit, bounded exports, structured logs, graceful shutdown, and Railway-ready deployment.

## Safety boundaries

The Discord bot never holds funds, connects wallets, signs transactions, requests seed phrases or private keys, presets trade size or slippage, rewards purchases, fabricates activity, or labels an unclassified wallet movement as a trade. Contributor points require human-approved work. Level XP is social recognition only and has no financial value.

## Discord application setup

1. Create or reuse the **MADGER_Bot** application in Discord Developer Portal. Do not create another community server.
2. Under **Bot**, enable the Server Members Intent and Message Content Intent. Presence Intent is not required.
3. Install to the official MADGER Community with `applications.commands` and `bot` scopes.
4. Grant only these permissions: View Channels, Send Messages, Embed Links, Read Message History, Add Reactions, Manage Messages, Moderate Members, Kick Members, Ban Members, Manage Roles, Manage Channels, Manage Server, Create Invite, View Audit Log, and Manage Guild Expressions. Do not grant Administrator.
5. Place the bot role above the quarantine, verified, member, and contributor roles it manages, but below owner and senior administrator roles.
6. Apply `supabase/migrations/202609220001_madger_discord_bot.sql`, followed by `supabase/migrations/202609220002_discord_active_mission_review.sql`, to the same Supabase project used by Telegram.
7. Configure the environment variables from `services/madger-discord-bot/.env.example` in the host secret manager.
8. From the service directory, run `npm ci`, `npm run check`, and `npm run register` once. Start with `npm start`.
9. In Discord, run `/admin setup`, `/admin sync-automod`, `/admin health`, `/madger verify`, `/madger price`, `/safety check-link`, and `/support ticket` as smoke tests.

## Required secrets

- `DISCORD_TOKEN`: bot token from the official Discord Developer Portal.
- `DISCORD_CLIENT_ID`: application ID for MADGER_Bot.
- `DISCORD_GUILD_ID`: official MADGER Community server ID.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: existing MADGER server-side project access.
- `DISCORD_ADMIN_USER_IDS`: comma-separated Discord user IDs authorized for MADGER operations.

Channel and role IDs are configuration, not code. Keep them in the hosting environment. Never commit the bot token, Supabase service-role key, or private Discord identifiers.

## Architecture

```text
Discord Gateway -> MADGER_Bot service -> Discord actions and responses
                         |
                         +-> shared Supabase records and verified market snapshots
                         +-> exact-mint DEX Screener fallback
                         +-> private moderation logs and health signals

Telegram webhook -> existing MADGER Command Bot -> same Supabase project
```

Gateway access is used because commands alone cannot provide edited-message moderation, member onboarding, join-raid detection, leveling, or reaction workflows. Slash commands and context menus remain the primary user interface.

## Efficiency controls

- One process and one Discord client; no duplicate bot fleet.
- One-minute XP cooldown, bounded in-memory flood windows, and automatic state pruning.
- Database access only for durable state; transient message fingerprints remain in memory.
- Direct verified DEX query with timeout and stored-snapshot fallback.
- Guild-scoped commands during rollout for immediate updates; switch to global registration only after production acceptance.
- Feature switches disable optional modules without removing safety controls.

## Future decisions

AI-assisted summaries, multilingual translation, voice-channel transcription, public web configuration, external ticket transcripts, Discord role connections, and cross-platform identity linking require separate privacy, cost, and abuse review before activation. The architecture leaves room for these modules without granting them authority today.
