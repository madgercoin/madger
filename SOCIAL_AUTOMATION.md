# MADGER social publishing automation

This system publishes approved, channel-specific MADGER campaigns from GitHub
without storing social credentials in the repository.

## Supported destinations

- X: `@madgercoin`
- Telegram announcement channel: `@madgercoin`
- Telegram community: `@madgerburrow`
- Discord: one selected MADGER server channel

## Security model

- Tokens and webhook URLs are stored only as encrypted GitHub Actions secrets.
- Campaign files contain public post copy only.
- The workflow refuses unapproved campaigns and unsupported channels.
- Discord mass mentions are disabled.
- Every successful campaign is moved from `social/outbox` to `social/sent`.
- Never paste a token, password, recovery code, or webhook URL into ChatGPT,
  an issue, a pull request, or a repository file.

## One-time Android setup

Open the repository in GitHub and go to:

`Settings` > `Secrets and variables` > `Actions` > `New repository secret`

Create these secrets:

| Secret | Source |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | BotFather token for the MADGER publishing bot |
| `TELEGRAM_ANNOUNCEMENT_CHAT_ID` | Numeric ID or `@madgercoin` |
| `TELEGRAM_COMMUNITY_CHAT_ID` | Numeric ID or `@madgerburrow` |
| `DISCORD_WEBHOOK_URL` | Webhook for the selected MADGER channel |
| `X_API_KEY` | X developer application |
| `X_API_SECRET` | X developer application |
| `X_ACCESS_TOKEN` | X user-context access token |
| `X_ACCESS_TOKEN_SECRET` | X user-context access-token secret |

The Telegram bot must be an administrator with permission to post in both
destinations. The Discord webhook should be limited to a single public
announcements channel. The X application needs permission to write posts.

## Publishing

Create one new file per campaign:

`social/outbox/<campaign-id>.json`

Use `social/outbox/example.json.example` as the schema. Merging or committing
the campaign to `main` triggers publication. After every destination succeeds,
the workflow archives the file under `social/sent`.

Use one campaign per commit. If a workflow partially publishes and then fails,
inspect the successful destinations before retrying to avoid duplicates.

## Dry run

In the repository, open `Actions` > `Publish social campaign` > `Run workflow`.
Provide the campaign path and leave `dry_run` enabled. The workflow validates
approval, supported destinations, and platform character limits without
publishing.
