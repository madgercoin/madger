# MADGER social outbox

Adding a new `.json` file to this directory triggers the GitHub Actions Buffer publisher. Existing outbox files are never processed merely because another file was added.

Required shape:

```json
{
  "publish": true,
  "campaignFile": "social/campaigns/2026-08-24-today.json",
  "assetUrl": "https://public.example/MADGER-campaign.mp4",
  "assetKind": "video",
  "publishMode": "shareNow",
  "dryRun": false
}
```

For a scheduled post, use `"publishMode": "customScheduled"` and add an ISO-8601 UTC `dueAt` value.

Safety rules:

- Use a unique filename for every intended publishing event.
- First validate a new account setup through the manual workflow with `dry_run` enabled.
- Do not edit an existing outbox JSON to publish it again; add a new uniquely named file.
- Do not rerun a successful outbox workflow, because social APIs do not provide a cross-platform idempotency guarantee.
- Never store API keys, passwords, session cookies, or tokens in this directory.
