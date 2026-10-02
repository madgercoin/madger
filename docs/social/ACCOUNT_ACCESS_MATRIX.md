# MADGER social account access matrix

**Checked:** October 1, 2026 for native profile access; listing corrections extended October 2. A connected flag alone does not prove that publishing works.

| Destination | Official account | Route | Verified state |
|---|---|---|---|
| X | `@MadgerDaBadger` | Buffer channel `6abebd4dea19ca0bde48a35c` | New profile bio and website saved. Buffer refresh succeeded, but publishing still failed with a reauthorization error. Native welcome is live and pinned; three follow-ups are scheduled October 2–4. The four Buffer drafts are reference copies. Buffer X automation remains disabled. |
| Instagram | `@madgercoin` | Buffer / native account | Native bio links `x.com/MadgerDaBadger`. New-X announcement published October 1 and verified publicly. |
| TikTok | `@themadgercoin` | Buffer | New-X announcement published October 1 and verified publicly. Native profile editing requires sign-in; X is not yet in its public bio. |
| Facebook | MADGER Page | Buffer channel `6a67ecc14b2d03035f50dbad` | New X announcement sent October 1. Page's About link still needs an administrator session. Never publish to the personal profile. |
| Reddit | `u/Madgercoin` | Native account | Profile social link already points to `@MadgerDaBadger`. `r/madgercoin` is banned and was not modified. |
| Telegram announcements | `Madgercoin` | Telegram / existing bot deployment | Browser requires sign-in for descriptions and pins. Production MADGERbot v4.6.2 adds official X to welcome and `/links` menus; public-data endpoint verifies new URL. |
| Telegram community | `Madgerburrow` | Forward from announcements | Browser requires sign-in for descriptions and pins. Production bot menus now expose the official X account. |
| Discord | The Burrow | Native server administration | Official X added to existing bot branch `codex/madger-discord-bot`. Browser requires sign-in; live server deployment and announcement remain unverified. |
| GitHub | `madgercoin/madger` | Git | Website sources already contain the new X link. Current publishing registry updated with replacement Buffer channel and actual failure status. |

## Publishing records

- Retired X channel: `6a67af8a4b2d03035f4e91f4`, disconnected. Do not reuse it for new content.
- Native welcome: https://x.com/MadgerDaBadger/status/2105791731308679374, live and pinned.
- CMC verification post: https://x.com/MadgerDaBadger/status/2105844165586153491, published October 2 UTC; references application 1452987 and authorizes the new X correction.
- Buffer reference welcome draft: `6abedb6363de9e09a27eb0ce`.
- Native follow-ups: October 2 at 10 AM, October 3 at noon, October 4 at 6 PM, America/New_York; all three verified in X Scheduled posts. Do not publish the matching Buffer copies again.
- Buffer reference follow-up drafts: `6abedfc1c07bdc2fc25d1297`, `6abedfc222215530c706a8e1`, `6abedfc222215530c706a905`.
- Facebook announcement: `6abedcb7c07bdc2fc25cc1da`, sent at `2026-10-01T22:20:42Z`.
- Instagram announcement: `6abee59763de9e09a27fbe2a`, sent at `2026-10-01T22:58:39Z`, https://www.instagram.com/p/Dd-CWJUDJkx/.
- TikTok announcement: `6abee5c122215530c707241f`, sent at `2026-10-01T23:01:01Z`, https://www.tiktok.com/@themadgercoin/photo/7691837755621461261.
- Telegram production bot: Supabase Edge Function `madger-command-bot`, deployment 39, v4.6.2. Existing webhook authentication retained; public-data `links.x` verified.
- Discord bot link commit: `da91762b8860f4de874274393ac1a18b4093b973`; deployment not verified.
- Historical disabled manifest entries retain their original channel and post IDs as evidence. They must not be reenabled or treated as replacement-account posts.

Credentials belong only in the authorized connector or encrypted deployment secrets, never in this registry.

Birdeye ticket 2695, CMC application 1452987, Solscan ticket 73560 and GeckoTerminal ticket 138773 have current correction requests. See [X-account listing corrections](../x-account-listing-corrections.md) for submitted evidence, exact provider status and the remaining Top100Token block.
