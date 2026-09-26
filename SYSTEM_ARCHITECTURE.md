# System architecture

## Runtime model

MADGER is a static Cloudflare Workers Static Assets site. There is no application server, database, authentication, wallet connection, or payment integration in the games. The existing contest proxy and bounded acquisition measurement remain separate website capabilities.

```text
root sources -> node build.mjs -> dist/ allowlist -> Cloudflare Worker -> madgercoin.com
```

`index.html`, `litepaper.html`, and `404.html` provide documents. `styles.css` provides shared homepage presentation; auxiliary pages use inline styles. `script.js` rotates Daily Dig content by UTC day, updates the year, manages mobile navigation, and progressively enhances mint copying. Metadata files provide crawling/install behavior. `_headers` supplies security/cache headers.

`reclaim/src/main.ts` and `reclaim/src/core.ts` are bundled locally with pinned Phaser, TypeScript, and esbuild versions into `dist/reclaim-game.js` and `dist/reclaim-core.js`. The combat slice makes no runtime network request and stores only a bounded device-local field record.

## Build boundary

`build.mjs` deletes `dist/` and copies the eleven root resources plus nine approved assets centralized in `site-config.mjs`. Anything not explicitly listed is private to the repository and not deployed. Internal documentation, package metadata, tests, validation scripts, and source maps are excluded. The obsolete Astro starter and declarations were removed rather than retained as misleading dead source.

## Deployment

`wrangler.json` names `madger-badger`, points assets to `dist`, enables automatic trailing-slash handling, and uses the custom 404 page. See `README_DEPLOY.txt` and `DEPLOYMENT.md`.

## Security and performance posture

The architecture minimizes attack surface and network dependencies. No personal data is collected. Long-lived immutable caching applies to `/assets/*`; asset changes requiring prompt propagation need new filenames. Static does not mean risk-free: content integrity, dependency/build-chain safety, Cloudflare access, and mint accuracy remain critical.

## Future Decisions

Shared auxiliary styles, content tooling, staging, monitoring, APIs, wallets, payments, data retention, and trust boundaries for any dynamic service remain undecided.
