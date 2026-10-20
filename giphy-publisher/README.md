# MADGER GIPHY publisher

Publishes approved original GIFs to `MadgerDaBadger` from GitHub Actions using the repository Actions secret `GIPHY_API_KEY`. The secret is never stored in source files or publication records.

## Queue and cadence

`queue.json` lists the approved assets, SHA-256 hashes, tags, source attribution, and earliest publication timestamps. The initial queue contains four future uploads, one per Tuesday/Thursday at 7:15 PM America/New_York, October 20 through October 29, 2026. An extra 7:45 PM check can recover a missed first run, and the publisher allows at most one regular publication per local date. GitHub may delay scheduled runs.

The initial `enabled` value is false. A live test upload must return a GIF whose owner is `MadgerDaBadger` before the queue can be enabled. A valid API key alone does not prove channel upload access. `request.json` starts that one test; after verification it is changed to `scheduled`.

The clips are excerpts from the owner's approved four-hero cinematic teaser, not actual gameplay. The other seven existing channel GIFs are already published and are not requeued. The creator authorized routine publication without asking for approval for each prepared item.

## Durable state

The workflow maintains JSON records on the `giphy-publisher-state` branch under `giphy-publisher-ledger/`. Before an upload POST, a durable `reserved` record must exist. The upload response ID is saved before checking channel ownership. Verified records become `published` and are skipped on every later run.

An ambiguous network result, a missing owner, a rejected upload, or an interrupted reservation pauses later uploads. The POST is never automatically repeated when it may already have succeeded. This favors avoiding duplicate or misattributed posts over silently retrying uncertain side effects. Resolve the recorded GIF ID and owner before changing such a record.

To extend the queue, add a new approved GIF under `assets/`, calculate its SHA-256, and add a unique queue entry with an explicit future `publishAt`. The publisher does not generate filler or repost old GIFs when the queue is empty. Scheduled publishing needs no browser session or owner confirmation. It still depends on GitHub availability, the credential remaining valid, and GIPHY granting channel upload access.

## Validation

Run `node --test giphy-publisher/publish.test.mjs`. Tests cover due-time gating, channel ownership, duplicate prevention, durable reservation, ambiguous POST handling, and New York dates across DST.

References:
- https://developers.giphy.com/docs/api/endpoint/upload/
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
