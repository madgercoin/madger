# Deployment overview

The detailed operational runbook is `README_DEPLOY.txt`. Production uses Node.js 22+, `npm ci`, `npm run build`, and Cloudflare Workers Static Assets through `wrangler.json`.

## Release sequence

1. Review source and authoritative status/mint changes.
2. Run `npm ci`, `git diff --check`, `npm run build`, and `npm run check`.
3. Inspect `dist/` against `build.mjs`; confirm no documentation, secrets, package files, or legacy Astro files.
4. Preview with Wrangler and complete visual/accessibility/link checks.
5. Record the commit and known-good deployment; deploy once through the authorized automated or manual path.
6. Verify critical URLs, exact mint, status, official links, metadata, headers, caches, console, mobile/desktop, keyboard, and 404 behavior.
7. Roll back rather than rushing a critical production repair.

## Public artifact boundary

Only files listed in `build.mjs` are intended for publication. Internal Markdown and TXT files must never be added merely to make them web-readable.

## Future Decisions

Deployment owners/approvals, staging, CI enforcement, domain/account custody, monitoring, alerts, release signing, and dynamic-service deployments are not defined.
