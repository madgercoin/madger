# MADGER Buffer automation

This repository can schedule approved MADGER posts through Buffer's GraphQL API without storing credentials in source control.

## Authorization

The workflow reads the repository secret `BUFFER_API_TOKEN`. Never paste the key into code, issues, pull requests, logs, or chat. The recommended key permissions are `accountRead`, `postsRead`, `postsWrite`, and `insightsRead`, with a one-year expiration for stable operation.

## Safety model

- Every manifest entry defaults to `enabled: false`.
- An entry is schedulable only after it has an approved caption, exact UTC `dueAt`, and verified public HTTPS `mediaUrl`.
- Scheduled posts are checked for an existing channel/text/time match before creation, preventing normal retry duplicates.
- A disconnected or locked channel stops the run.
- Ambiguous channel matching stops the run.
- The hourly workflow is active. When no manifest entries are enabled, it exits safely without creating a Buffer post.
- `workflow_dispatch` supports a read-only `discover` operation and a deliberate `publish` operation.

## Media requirement

Buffer fetches API media from a public URL; it does not accept a file upload in the GraphQL request. The media must remain publicly accessible until the post publishes. Cloudflare R2 is the intended MADGER media host. Google Drive sharing links are not suitable for this workflow.

Set `mediaType` to `image` for a static image or `video` for a video. Legacy entries without `mediaType` remain videos. The automation rejects unsupported values before it calls Buffer.

## Initial activation sequence

1. Merge the automation pull request.
2. Run **Actions → MADGER Buffer Automation → Run workflow → discover**.
3. Confirm the expected Facebook, Instagram, TikTok, X, and YouTube channels are present, connected, unlocked, and unpaused.
4. Upload approved images or videos to the public media host and verify each URL in a private browser.
5. Add the verified URLs to `content/buffer-schedule.json`.
6. Review captions, UTC timestamps, platform metadata, and launch-state compliance.
7. Change only approved entries to `enabled: true`.
8. Run `publish` manually once and verify the resulting Buffer queue.
9. Set repository variable `BUFFER_AUTOMATION_ENABLED` to `true` only after the manual production test passes.

## Operations

- To pause all automatic runs, disable the workflow in GitHub Actions. Disabling every manifest entry keeps the active workflow safely idle.
- To stop one post, set that manifest entry's `enabled` value to `false` before it is submitted.
- To rotate authorization, regenerate the Buffer key and replace the `BUFFER_API_TOKEN` repository secret.
- Do not change a scheduled post's caption or time solely to defeat duplicate detection. Verify the Buffer queue before resubmitting altered content.

## Official references

- Buffer API: https://developers.buffer.com/
- Scheduled posts: https://developers.buffer.com/examples/create-scheduled-post.html
- Video posts: https://developers.buffer.com/examples/create-video-post.html
- Media hosting: https://support.buffer.com/article/859-does-buffer-have-an-api#hosting-media
