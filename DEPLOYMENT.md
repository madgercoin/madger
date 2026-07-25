# Deployment overview

The detailed operational runbook is `README_DEPLOY.txt`. Production uses Node.js 22+, `npm ci`, `npm run build`, and Cloudflare Workers Static Assets through `wrangler.json`.

## Release sequence

1. Review source and authoritative status/mint changes.
2. Run `npm ci`, `git diff --check`, `npm run build`, `npm run check`, `npm run validate`, and `npm audit --omit=dev`.
3. Inspect `dist/` against `site-config.mjs`; confirm no documentation, secrets, package files, or starter content.
4. Preview with Wrangler and complete visual/accessibility/link checks.
5. Record the commit and known-good deployment; deploy once through the authorized automated or manual path.
6. Run `npm run check:deployment` to verify critical URLs, exact mint, retired language, official links, headers, and 404 behavior; then check metadata, caches, console, mobile/desktop, and keyboard behavior.
7. Roll back rather than rushing a critical production repair.

## Public artifact boundary

Only files listed in `site-config.mjs` are intended for publication. `npm run validate:dist` enforces the exact built set. Internal Markdown and TXT files must never be added merely to make them web-readable.

## Future Decisions

Deployment owners/approvals, staging, branch-protection enforcement, domain/account custody, monitoring, alerts, release signing, and dynamic-service deployments are not defined.
