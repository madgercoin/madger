# MADGER trust registry operations

`verified-contributions.json` is the public, same-origin source of truth for reviewed badges. A screenshot, local Trail XP, proof-packet reference, social profile, or wallet holding is never sufficient verification.

## Review lifecycle

1. Receive an `UNREVIEWED` proof packet through the published community channel.
2. Check that its public evidence matches the claimed work and contains no secrets or unnecessary personal data.
3. Score evidence, usefulness, originality, and safety. Record a reason for rejection or the reviewed XP for approval.
4. Require two independent reviewers for Warden and Burrowkeeper decisions. Reviewers disclose conflicts and do not review their own work.
5. Add or update the contributor record in a pull request. A second maintainer confirms schema, evidence, XP arithmetic, rank threshold, and reviewer requirements.
6. Merge only after `npm run validate` passes. The normal production workflow publishes the registry with the application.

## Contributor record schema

```json
{
  "callsign": "Exact public callsign",
  "rank": "SCOUT",
  "reviewedXp": 25,
  "status": "active",
  "reviewedAt": "2026-09-12T00:00:00Z",
  "references": ["MGR-1234ABCD"],
  "evidence": ["https://public.example/evidence"],
  "reviewers": ["reviewer-callsign"]
}
```

Callsigns and references must be unique without regard to case. `status` is `active` or `revoked`. Rank must equal the highest threshold reached by `reviewedXp`. A revoked record remains in history but is never returned as verified by the app.

## Corrections, appeals, and revocation

Rejected contributors receive a reason and one appeal reviewed by someone other than the original reviewer. Correct factual errors through a new pull request. Revoke a record when its evidence is fraudulent, withdrawn, unsafe, or materially invalidated; include the non-sensitive reason in the review discussion and set `status` to `revoked`.
