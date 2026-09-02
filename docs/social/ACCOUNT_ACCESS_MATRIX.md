# MADGER social account access matrix

**Checked:** 2026-08-24  
**Rule:** A destination is not called autonomous until a harmless live API check succeeds through the durable publisher.

| Destination | Recorded account | Durable route | Current state |
|---|---|---|---|
| X | `@madgercoin` | Buffer API | Account was recorded as connected in prior setup; live API validation awaits the encrypted `BUFFER_API_KEY` repository secret |
| Instagram | `@madgercoin` | Buffer API | Account was recorded as connected in prior setup; live API validation awaits the encrypted secret |
| TikTok | `@themadgercoin` | Buffer API | Account was recorded as connected in prior setup; live API validation awaits the encrypted secret |
| Facebook | MADGER Page only | Buffer API | Page was the recorded destination; personal Facebook is permanently excluded; live API validation awaits the encrypted secret |
| Telegram announcements | `Madgercoin` | Separate Telegram automation | No durable Telegram connector or bot authorization is available in this project yet |
| Telegram community | `Madgerburrow` | Forward from announcements | No durable Telegram connector or bot authorization is available in this project yet |
| Reddit | Not verified | None | No authorized account recovered |
| Discord | Not verified | None | No authorized server/bot recovered |
| GitHub | `madgercoin/madger` | Connected GitHub app | Connected with repository admin access; social automation files are committed |

## ChatGPT Buffer plugin state

The exact custom plugin identifier shown in the August 24 ChatGPT settings URL, `plugin_asdk_app_6a8cc08f56548191986db5746bf71c8e`, reported **not installed** when checked through ChatGPT's connection manager. No Buffer posting tools are exposed in the active conversation. This is why the repository publisher uses Buffer's official API instead of pretending the chat plugin can post.

## Meaning of one-time authorization

The Buffer API key is stored only as the encrypted GitHub Actions secret `BUFFER_API_KEY`. Buffer then retains the five social connections and posts automatically. A social network may still force an occasional reconnection if it expires or revokes its own authorization; no legitimate system can guarantee that platform-controlled sessions will never expire.
