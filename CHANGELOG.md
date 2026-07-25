# Changelog

Notable repository changes are recorded here. Dates use UTC. This project does not currently define semantic-release or version-tag policy.

## Unreleased

### Changed

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
