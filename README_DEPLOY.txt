# MADGER production deployment runbook

This runbook covers the deployment path verified in this repository: an allowlisted static bundle hosted by Cloudflare Workers Static Assets. It replaces older instructions that suggested uploading source files directly. Production must be built from the repository so the deployed artifact matches `build.mjs` and `wrangler.json`.

## Deployment contract

- npm package: `madger-website` version `5.0.0`
- Runtime: Node.js 22 or newer
- Build: `npm run build` (`node build.mjs`)
- Output: ignored `dist/` directory
- Deploy: `npm run deploy` (`wrangler deploy`)
- Worker: `madger-badger`
- Static asset directory: `./dist`
- Routing: automatic trailing slashes and `404.html` for missing routes
- Production hostname referenced by site metadata: `https://madgercoin.com`

The GitHub/Cloudflare production integration is expected to build the `main` branch with `npm run build` and deploy with `npx wrangler deploy`. Dashboard configuration and credentials are external state: verify them before relying on automation.

## What the build publishes

`build.mjs` deletes any previous `dist/`, creates `dist/assets/`, then copies an explicit list.

Published at the site root:

```text
index.html              litepaper.html       404.html
styles.css              script.js            robots.txt
sitemap.xml             manifest.webmanifest _headers
```

Published below `/assets/`:

```text
madger_hero_burrow_v7.jpg        madger_official_logo_transparent_512.png
madger_social_share_v10.jpg       madger_v6_community_welcome.webp
```

No repository documentation, validation script, package file, or other unlisted source is published. A build log should report 18 copied source files; treat any unexpected count as a reason to inspect `dist/`, not as permission to deploy.

## First-time workstation setup

```sh
node --version
npm --version
npm ci
```

Confirm Node reports v22 or newer. `npm ci` must be used for releases because it installs the dependency versions in `package-lock.json`; do not silently regenerate the lockfile during a production deployment.

Cloudflare authentication is intentionally not stored here. Use the organization's approved Wrangler login or scoped API-token process. Never commit `.env`, `.dev.vars`, API tokens, wallet keys, seed phrases, or dashboard exports containing secrets.

## Pre-deployment gate

1. Confirm `git status --short` is understood and the intended commit is checked out.
2. Review the diff for unapproved contract addresses, financial promises, stale launch status, private data, and unexpected external URLs.
3. Run:

   ```sh
   npm ci
   npm run check
   npm run validate
   npm audit --omit=dev
   ```

4. Inspect `dist/` and confirm it contains only the allowlisted production files.
5. Serve a preview with `npx wrangler dev` and complete `VISUAL_QA.txt` plus the applicable gates in `IMPLEMENTATION_CHECKLIST.txt`.
6. Verify `robots.txt`, `sitemap.xml`, canonical URLs, manifest paths, and social preview paths use `madgercoin.com` and resolve as intended.
7. Record the commit SHA and identify the previous known-good Cloudflare deployment before publishing.

Wrangler is maintained and pinned, and obsolete Astro configuration has been removed. `npm run check` should complete without repository warnings; proxy notices caused by an injected local/CI environment are not application defects.

## Preview and production

Preview locally:

```sh
npx wrangler dev
```

Run a Cloudflare packaging dry run:

```sh
npm run check
```

Deploy the reviewed commit manually when authorized:

```sh
npm run deploy
```

For an automated `main` deployment, observe the Cloudflare build rather than also issuing a manual deploy. Do not publish concurrent builds whose ordering is unclear.

## Post-deployment verification

Run `npm run check:deployment` (or set `SITE_URL` to a Workers preview origin) for repeatable HTTP checks, then complete the browser-oriented checks below.

Test the Workers preview URL first when one is available, then `https://madgercoin.com` after the custom domain reports active:

- `/`, `/litepaper.html`, a known missing path, `/styles.css`, `/script.js`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`, and representative `/assets/*` URLs return the expected content/status.
- HTTPS is valid, there are no mixed-content or console errors, and navigation works with mouse, touch, and keyboard.
- Desktop and mobile layouts match the visual QA expectations; the skip link, menu expanded state, focus states, reduced-motion preference, and expandable FAQ remain usable.
- Page source contains the expected canonical, Open Graph, X card, favicon, and manifest metadata.
- Official X and Telegram links are correct. Launch status, token data, warnings, and litepaper language agree.
- Response headers include `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, the restrictive camera/microphone/geolocation `Permissions-Policy`, and `X-Frame-Options: DENY`.
- Root HTML is not cached longer than intended and fingerprint-free assets follow the documented cache behavior.

## Cache and content updates

`_headers` currently gives `/assets/*` a one-year immutable cache policy and `/*.html` a five-minute cache policy. Asset filenames are not content-hashed. Therefore **never replace a production image in place and assume returning visitors will see it immediately**. For time-sensitive asset changes, use a new filename, update all references and the `site-config.mjs` allowlist, then decide when the old asset can be removed. CSS, JavaScript, manifest, sitemap, and robots caching is not explicitly declared in `_headers`; verify Cloudflare's effective headers after deployment.

## Rollback

1. Stop additional deployments and identify the last known-good deployment and commit SHA.
2. Use Cloudflare's deployment history to roll back to that known-good version, following current dashboard controls and organizational access policy.
3. Verify the same post-deployment checklist against both the Workers URL and custom domain.
4. Revert or fix the source change in Git so the next automated build cannot redeploy the incident.
5. Document impact, timestamps, affected URLs, resolution, and preventative follow-up without exposing credentials or security-sensitive details.

If no known-good Cloudflare version is available, check out the recorded commit, run `npm ci && npm run check`, inspect its artifact, and deploy only after authorized review.

## Incident priorities

- **Security or false contract information:** remove/rollback immediately, announce corrections only through verified channels, preserve evidence, and rotate any exposed credentials.
- **Broken site or inaccessible critical content:** roll back before attempting a rushed production patch.
- **Stale visual asset caused by immutable caching:** publish a newly named asset and references; do not weaken the entire caching policy without review.
- **Custom-domain issue:** verify the Workers URL to distinguish artifact failure from DNS/domain configuration, then use Cloudflare's current domain diagnostics.

## Future Decisions

- Named deployment owners, required approvers, Cloudflare account/runbook custody, and emergency contacts.
- Separate preview/staging and production environments, branch protection, CI enforcement, automated smoke/accessibility tests, monitoring, alerting, and uptime objectives.
- Whether to adopt fingerprinted assets and explicit cache rules for every response type.
- Formal secret management, token scopes/rotation, deployment audit retention, and security incident policy.
- Deployment design for future APIs, wallet interactions, payments, or other dynamic utility. None should inherit this static deployment path without a threat model and operational review.
