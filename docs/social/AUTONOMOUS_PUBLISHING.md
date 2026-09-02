# MADGER autonomous social publishing

This repository contains a guarded Buffer publishing workflow for the confirmed MADGER destinations:

- X `@madgercoin`
- Instagram `@madgercoin`
- TikTok `@themadgercoin`
- the MADGER Facebook Page

The personal Facebook profile is explicitly excluded. Telegram is separate: publish to the `Madgercoin` announcement channel, then forward to the `Madgerburrow` community group.

## One-time setup

1. Keep each MADGER social account connected inside Buffer.
2. Create a Buffer API key at <https://publish.buffer.com/settings/api>.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**.
4. Create the secret `BUFFER_API_KEY`. Paste the key into GitHub's secret value field; never put it in a commit, issue, chat, or campaign file.
5. If the Buffer account contains more than one organization, add an Actions repository variable named `BUFFER_ORGANIZATION_ID`.

After this, GitHub Actions can publish without logging in to every social network again. Individual social networks can still require occasional reconnection when their own authorization expires or their policies change.

## Autonomous outbox

After the one-time setup and first dry run, add a uniquely named JSON instruction to `social/outbox/`. The commit automatically triggers the publishing workflow; no Buffer or social-network login is needed for each campaign. The outbox file points to an approved campaign JSON and public media URL. See `social/outbox/README.md` for the exact format and rerun guardrails.

## Publish or validate a campaign

Open **Actions → Publish MADGER social campaign → Run workflow**.

- `campaign_file`: the campaign JSON stored in `social/campaigns/`
- `asset_url`: a public HTTPS URL that Buffer can fetch
- `asset_kind`: `video` for the standard animated social asset; `image` for a static fallback
- `publish_mode`: `shareNow`, `addToQueue`, `shareNext`, or `customScheduled`
- `due_at`: required for `customScheduled`, in ISO-8601 UTC format
- `dry_run`: leave on for the first run; it validates the exact five destinations without publishing

The script refuses disconnected, locked, missing, or ambiguous channel matches. It requires exactly one destination for each MADGER service and will not silently choose a different account.

## Media rule

Use the approved 1080×1350 H.264 MADGER animation as a locked composition. Do not regenerate, morph, redraw, or alter Madger's canonical likeness. Buffer needs a public HTTPS media URL; a local file path or private Library URL is not sufficient.

## API source

The implementation follows Buffer's current GraphQL API and uses `SchedulingType: automatic` so publishing does not require a manual notification step.
