# MADGER Video Contest Synchronization

This folder contains the transfer trigger used to move verified contest uploads from Supabase Storage into the contest administration workflow.

## Source of truth

Ready submissions are enumerated directly from Supabase Postgres table `public.madger_video_contest_entries` with:

- `upload_complete = true`
- `sync_status = 'ready'`

The GitHub/Supabase bridge is **not** used to query or enumerate database rows.

## File transfer

For each already-enumerated ready submission, `contest-sync/request.json` is updated with:

```json
{
  "action": "video",
  "submission_id": "<uuid>",
  "file_name": "<exact original file name>",
  "file_size": 123456,
  "requested_at": "<ISO timestamp>"
}
```

That change triggers `.github/workflows/contest-video-fetch.yml`.

The workflow obtains a short-lived GitHub Actions OIDC token and calls the Supabase Edge Function `contest-video-bridge`. The bridge is storage-only: it validates the GitHub identity and downloads exactly `submission_id/file_name` from bucket `madger-video-contest-sept-2026`. It does not query the contest table.

The workflow verifies the expected byte size, then creates an artifact containing:

- the exact original video file
- `SHA256.txt`
- `SIZE.txt`

The trigger should normally be returned to:

```json
{
  "action": "idle",
  "requested_at": "<ISO timestamp>"
}
```

## Synchronization contract

Before any write, check both the Entries sheet and the original-video Drive folder for the exact Submission ID / expected file to prevent duplicates.

After downloading the workflow artifact, require all of the following before upload:

1. Extracted filename exactly equals the Supabase `file_name`.
2. Extracted byte size exactly equals Supabase `file_size`.
3. SHA-256 of the extracted file exactly matches `SHA256.txt`.

Upload the unchanged original file to Google Drive folder `01 Original Video Submissions`.

Write exactly one row to `Entries` and exactly one row to `Admin Review`. The `Admin Review` tab has pre-populated template cells, so use an explicit `updateCells` write to the first truly empty data row rather than `appendCells`.

Only after the Drive file, Entries row, and Admin Review row are each verified exactly once may the Supabase row be updated from `ready` to `synced`.

## States

- `pending`: not eligible for synchronization yet; do not process.
- `ready`: eligible for synchronization.
- `synced`: synchronization completed and verified.

Never change a row to `synced` after a partial or unverified operation.

## Failure handling

On any transfer, verification, Drive, or spreadsheet failure:

- leave the Supabase row at `ready`
- do not create compensating duplicates
- report the Submission ID and specific failed operation
- return `request.json` to `idle` when practical

If the direct Supabase enumeration query fails, perform no Drive or spreadsheet writes and do not use the file-transfer bridge as a database fallback.
