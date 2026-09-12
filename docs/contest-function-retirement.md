# Contest Function Retirement

The MADGER video contest was permanently retired. On 2026-09-12, the five remaining Supabase Edge Functions were replaced with inert 410 Gone tombstones and changed to require a valid Supabase JWT at the gateway:

- madger-video-contest
- madger-contest-asset-upload-temp
- madger-contest-public-asset-upload-temp
- contest-video-bridge
- contest-sync-export

The tombstones perform no reads, writes, uploads, exports, or external requests. Anonymous verification returned HTTP 401 for all five endpoints. Historical deployment versions remain the rollback record, but these functions must not be reactivated without a new, explicit product decision and security review.
