# Changelog

Notable repository changes are recorded here. Dates use UTC. This project does not currently define semantic-release or version-tag policy.

## Unreleased

### Repository operations

- Added dependency maintenance, pinned GitHub Actions, CODEOWNERS, structured issue and pull-request
  intake, stale-CI cancellation, and a public code of conduct.
- Added weekly CodeQL analysis and high-severity dependency-diff enforcement for pull requests.
- Updated pinned Wrangler from 4.114.0 to 4.120.1, clearing a newly disclosed high-severity
  development-tree `undici` advisory without a major-version change.

### Changed

- Replaced Telegram contest-entry routing with the official Google Form on madgercoin.com, updated the contest rules and operations record, and made the homepage contest poster open the contest page.

- Added the verified `u/Madgercoin` Reddit identity to the homepage social directory and Organization structured data, with automated regression protection against an uncreated subreddit or unverified Discord invite.
- Added a contribution-first Reddit/Discord operating model, channel architecture, moderation controls, launch communication adaptations, and release gates while keeping Discord publication blocked until the authenticated server and durable invite are verified.
- Made local asset-link validation path-separator independent so the same source checks run correctly on Windows and Linux.

- Tightened the homepage mascot composition with a crop-only, cache-safe 900×1184 portrait derivative and responsive natural-ratio layout.
- Added a broadly compatible 1200×630 JPEG social card, wired it into Open Graph/X metadata, and strengthened regression checks for preview dimensions, portrait framing, the community anchor, and the canonical Facebook URL.
- Reconciled the V5 asset manifest, brand guidance, visual QA, deployment inventory, architecture counts, and SEO documentation with the production allowlist.
- Activated safe hourly Buffer publishing with disabled-by-default entries, duplicate detection, and an idle no-post path.
- Scheduled and instrumented a refreshed X community post after channel reauthorization, replacing the failed campaign entry with new “Keep Digging” copy.
- Added the authoritative launch plan plus T−7-to-T+72 runbook, liquidity-method comparison, five-wallet custody controls, embargoed communications, post-launch listing preparation, and a founder-only decision register.
- Added a four-value public launch-state controller with `MINTED_NOT_TRADING` active on every page and no trading/purchase links.
- Added automated gates for exact mint integrity, consistent public state, pre-launch trading-link prohibition, launch-document exclusion, and operational-wallet/private-material exclusion from `dist/`.

- Added CI for pull requests to and pushes on `main`, covering deterministic install, whitespace, build, Cloudflare dry-run, JavaScript syntax, links/IDs, JSON-LD, exact mint, dist allowlist, secret patterns, and production dependency audit.
- Added maintained repository validators and a post-deployment HTTPS/content/route/social-link/security-header smoke check.
- Centralized the production allowlist in `site-config.mjs` and removed unused Astro starter files after confirming they were outside the production build.
- Updated and pinned Wrangler from 4.88.0 to 4.114.0, resolving all six development-tree audit findings and the obsolete Astro configuration warning without changing the Cloudflare compatibility date.
- Strengthened static response headers with CSP and HSTS.

- Updated every production status surface to state that MADGER is minted on Solana but not publicly launched for trading.
- Published the exact official mint `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv` in the homepage safety panel, FAQ, and litepaper.
- Added an accessible, dependency-free copy-mint control with live success/failure feedback.
- Updated homepage metadata, `WebSite` structured data, manifest description, roadmap, token safety, and risk language without adding purchase guidance or unverified launch claims.
- Corrected narrow-screen overflow in homepage display content and long litepaper mint/headline content.
- Added repository-specific product, AI, brand, design, UX, architecture, asset, SEO, accessibility, security, deployment, roadmap, and contribution documentation.

### Security

- Replaced obsolete “no contract” language with exact mint verification guidance and explicit warnings that minting does not imply public trading.

## 2026-07-25

### Documentation

- Established the initial contributor, deployment, implementation, and visual QA documentation set.

## Future Decisions

Release versioning, tag format, changelog automation, and whether historical commits should be backfilled are not defined.
