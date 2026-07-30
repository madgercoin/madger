# MADGER Telegram automation

The repository uses the existing `@madger_publisher_bot` BotFather bot to publish reviewed MADGER messages to the official announcement channel and community group.

## Authorization

Store the current bot token only in the repository Actions secret `TELEGRAM_BOT_TOKEN`. Never place the token in source code, issue text, pull-request text, workflow logs, or chat.

The bot must be an administrator in:

- `@madgercoin`, with permission to post, edit, and delete messages.
- `@madgerburrow`, with permission to delete messages and restrict members.

The verification operation checks the token's bot username and these required permissions before publication.

## Safety model

- The expected bot identity is fixed in `content/telegram-schedule.json`.
- Every schedule entry defaults to `enabled: false`.
- IDs must be unique; targets must be either `channel` or `group`.
- Media must use a public HTTPS URL.
- Captions and text are rejected when they exceed Telegram limits.
- Due posts are claimed and committed before sending, preventing automatic retries from publishing duplicates.
- Posts more than 90 minutes late expire instead of being published at an unsuitable time.
- Failed sends are recorded and are not retried automatically.
- Scheduled and push-triggered publication remain inactive unless `TELEGRAM_AUTOMATION_ENABLED` equals `true`.

## Activation

1. Add `TELEGRAM_BOT_TOKEN` to repository Actions secrets.
2. Add the existing bot to both official Telegram destinations with the permissions above.
3. Merge the integration.
4. Run **Actions → MADGER Telegram Automation → Run workflow → verify**.
5. Add reviewed entries to `content/telegram-schedule.json`.
6. Run `publish` manually with a single low-risk test entry.
7. Confirm the post and state record.
8. Set the repository variable `TELEGRAM_AUTOMATION_ENABLED` to `true`.

To pause automatic publication, set `TELEGRAM_AUTOMATION_ENABLED` to `false` or remove it.

