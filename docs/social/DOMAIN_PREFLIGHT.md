# MADGER publishing domain preflight

Canonical website: **https://madgercoin.com**, verified in `README.md` and `PROJECT_CONTEXT.md`. The code source of truth is `MADGER_WEBSITE` in `scripts/social-domain-preflight.mjs`. Changes require checking those records together.

The scheduled and immediate Buffer automation, campaign/outbox publisher (including dry runs), and legacy Launch Hunt publisher validate the entire selected batch before API calls. They reject `madgerbadgercoin.com`, other hosts containing `madger`, URL credentials, and noncanonical URLs explicitly declared as `websiteUrl`, `officialWebsite`, or `madgerWebsiteUrl`. Apex and `www.madgercoin.com` are allowed. Published captions, nested URL/link fields, alt text, titles, and declared `artworkText` are scanned; internal IDs, campaign names and file paths are not prose. X, Instagram, YouTube and unrelated third-party domains remain allowed. Known S3 bucket/R2 tenant hosts are allowed specifically in media transport fields, even with MADGER in the tenant name; this exception never applies to owned website fields. This is not an external-domain ban.

## Preflight checklist

MADGER website URLs must use HTTPS and the standard port 443 (omitted or explicit); custom ports and HTTP are rejected. Review timestamps must name a real calendar date and time, with `Z` or a valid numeric timezone offset. Impossible dates and normalized next-day times do not count as review evidence.

1. Compare every MADGER website reference to https://madgercoin.com. Label an owned website link with `websiteUrl` so even an unrelated misspelling is checked. Owned website fields accept a single absolute HTTPS URL string; arrays, objects and other shapes are rejected. Verify third-party destinations independently.
2. Check all platform captions, link fields, alt text, titles and declared `artworkText`. Declare the full visible artwork copy, including any website text; do not infer it from a caption.
3. Open each exact final public media URL. Inspect the image at readable resolution, or every video frame/scene with text (including outro, thumbnail and QR destinations). Confirm MADGER website references show `madgercoin.com` and match the caption. Check accessibility text too.
4. Record the actual human visual review on each active schedule entry or campaign JSON (not just in an outbox). Use this structure, replacing example values with the real review:

```json
{
  "artworkText": "Full visible copy, including madgercoin.com when present",
  "artworkUrlReview": {
    "mediaUrls": ["https://media.example/final-v2.jpg"],
    "reviewedBy": "Actual reviewer",
    "reviewedAt": "2026-10-11T00:00:00Z",
    "website": "https://madgercoin.com",
    "confirmed": true
  }
}
```

5. Run `npm run test:social-domain` and the publisher's existing dry run where available. Resolve the field/context in any `MADGER preflight` error before submission. Check the resulting queue as usual.

## Limits and integration effects

There is no supported OCR/pixel validator in this pipeline. The code validates declared text and requires a human attestation for every exact media URL. It cannot prove the attestation is truthful, inspect pixels, decode QR codes, follow redirects/short links, or detect changed bytes at the same URL. Use immutable/versioned asset URLs and repeat review whenever bytes change. Hosts not containing `madger` require explicit owned-website fields to be classified as MADGER-owned. This guard does not verify third-party link safety or all possible obfuscated text.

After merge, repository publishers require these records for media, including existing entries deliberately re-enabled or marked `publishNow`. Disabled entries and cancellation/discovery operations are unaffected. Legacy Launch Hunt reruns fail until actual review records are added to their hardcoded posts; do not fabricate historical reviews. Review data is not sent to Buffer. The guard does not inspect or fix posts already queued, and native social/Buffer UI or connector operations outside these scripts need this checklist separately.

The guard runs from the checked-out GitHub Actions revision and does not need a website deployment to operate. However, the existing production deployment workflow watches `scripts/**` and root JSON on pushes to `main`, so merging this PR would also trigger that existing website deployment. The static website output is unchanged. Existing workflow cadence, publishing modes, permissions and credentials are unchanged. The workflow that triggers on outbox additions has no branch filter; no outbox files are added or changed by this patch. A draft PR alone does not activate the guard in main-branch publishing runs. Do not merge or deploy without the owner's release decision.
