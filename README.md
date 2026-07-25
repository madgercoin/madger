# MADGER website

This repository is the production source for [madgercoin.com](https://madgercoin.com), the official home of MADGER: a professional, community-driven Solana memecoin represented by the Honey Badger.

MADGER's character is resilient, confident, determined, and attentive to detail. The product standard follows the character: quality before speed, facts before hype, and durable systems before short-lived trends. The long-term direction is to grow from a memecoin and character brand into a cryptocurrency ecosystem with practical utility, including real-world crypto payments when the project can support them responsibly. That direction is a vision—not a promise that a product, token, or utility currently exists.

> **Current verified status:** the site and litepaper describe MADGER as pre-launch. No official token contract has been announced. Never add or circulate a contract address until it has been approved and published through the official channels listed below.

## Documentation map

These files are the contributor source of truth. When implementation and documentation disagree, verify the implementation, correct the documentation in the same change, and call out any unresolved product decision.

- [`README.md`](README.md) — project purpose, repository architecture, contributor standards, and verified status.
- [`README_DEPLOY.txt`](README_DEPLOY.txt) — reproducible build, Cloudflare Workers deployment, rollback, and operations runbook.
- [`IMPLEMENTATION_CHECKLIST.txt`](IMPLEMENTATION_CHECKLIST.txt) — release gates for content, engineering, security, launch, and future utility.
- [`VISUAL_QA.txt`](VISUAL_QA.txt) — brand asset inventory and visual/accessibility review procedure.
- [`litepaper.html`](litepaper.html) — public-facing pre-launch project summary and risk disclosure; it is a deployed page, not internal engineering documentation.

## Production architecture

The production application is deliberately small and static:

| Area | Authoritative files | Responsibility |
| --- | --- | --- |
| Pages | `index.html`, `litepaper.html`, `404.html` | Semantic content, metadata, navigation, disclosures, and official links |
| Presentation | `styles.css` | Brand tokens, responsive layout, focus states, reduced-motion behavior, and component styling |
| Behavior | `script.js` | UTC-based Daily Dig copy, current footer year, and accessible mobile-navigation state |
| Brand assets | Root-level `madger_*` images and `favicon.png` | Approved production imagery copied to `/assets/` at build time |
| Web metadata | `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers` | Install metadata, crawler discovery, canonical URLs, security headers, and cache policy |
| Build | `build.mjs` | Clears `dist/`, copies an explicit allowlist of pages and assets, and performs no transformation |
| Hosting | `wrangler.json` | Cloudflare Workers Static Assets configuration, trailing-slash handling, and the custom 404 page |

`dist/` is generated and ignored. Do not edit it. The explicit arrays in `build.mjs` are a deployment boundary: adding a source file does **not** publish it unless it is also added to the appropriate allowlist.

### Legacy Astro material

`src/`, `public/`, `tsconfig.json`, and `worker-configuration.d.ts` are remnants of an earlier Astro starter. Astro is not declared in `package.json`, there is no Astro configuration, and none of those files are copied by `build.mjs`. They are therefore **not part of the current production site**. Do not implement production features there. Any decision to remove or revive this material must be a deliberate, separately reviewed migration.

## Local development

### Requirements

- Node.js 22 or newer (enforced by `package.json`)
- npm, using the committed `package-lock.json`

Install exactly the locked dependency tree and build:

```sh
npm ci
npm run build
```

Serve the generated artifact rather than relying on `file://` URLs, because production uses root-relative paths:

```sh
npx wrangler dev
```

Then open the local URL printed by Wrangler. For a production-shaped validation without publishing:

```sh
npm run check
```

`npm run check` rebuilds and runs `wrangler deploy --dry-run`. A warning that `tsconfig.json` cannot resolve `astro/tsconfigs/strict` is caused by the excluded legacy Astro material described above; it does not alter the static artifact. It should be removed only as part of the explicit legacy-code decision.

## Making a change

1. Start from a clean branch and read all four documentation files.
2. Confirm the statement or behavior in current production files; do not infer token, treasury, liquidity, legal, payment, or governance details.
3. Make the smallest maintainable change. Preserve semantic HTML, keyboard access, visible focus, reduced-motion support, responsive layouts, and the existing visual language.
4. If a deployable file or asset is added or removed, update `build.mjs`; if a public page changes location, also review `sitemap.xml`, canonical metadata, navigation, and redirects/404 behavior.
5. Run the build and release checks in `IMPLEMENTATION_CHECKLIST.txt`, including the visual procedure when presentation changes.
6. Update relevant documentation in the same commit. Describe verified facts as facts and place unresolved matters under **Future Decisions**.

## Brand and editorial standard

- Always write the project name as **MADGER**; `$MADGER` is the proposed ticker only.
- **The Burrow** is the community. “Keep digging,” “No hype. No panic. Just dig,” dry humor, and the determined Honey Badger voice are established motifs.
- Voice may be bold and playful, but never careless, hostile, deceptive, or financially promotional.
- Preserve the dark ink/bone palette, gold accents, rugged display typography, original mascot imagery, and generous safe space documented in `VISUAL_QA.txt`.
- Distinguish present capability, proposal, and aspiration. Never present roadmap items, payment support, profitability, listings, partnerships, or price outcomes as guaranteed.
- Prefer concise, plain-language safety copy. Any contract publication must be consistent across the website, X, and Telegram announcements.

## Engineering quality bar

Every change should optimize for long-term ownership rather than fastest delivery:

- **Maintainability:** keep responsibilities separated, avoid unnecessary dependencies, document non-obvious choices, and keep the build allowlist accurate.
- **Accessibility:** preserve landmarks, heading order, keyboard operation, meaningful alternatives for informative images, intentionally empty alternatives for decorative images, adequate contrast, touch targets, and `prefers-reduced-motion` behavior.
- **Performance:** keep the site static and dependency-light; resize/compress imagery appropriately; avoid render-blocking third-party scripts and layout shift.
- **Security and privacy:** minimize collection and external code; retain `_headers` protections; use `rel="noopener noreferrer"` for new-tab links; never commit secrets, private keys, seed phrases, wallet credentials, or unapproved contract data.
- **Reliability:** use pinned dependencies, deterministic builds, preview before production, validate official links and claims, and retain a known-good deployment for rollback.
- **Sustainability:** adopt a framework, service, wallet integration, analytics product, or payment provider only when its ongoing operational burden and user benefit are understood.

## Official channels

Only these endpoints are verified by the current repository:

- Website: [madgercoin.com](https://madgercoin.com)
- X: [@madgercoin](https://x.com/madgercoin)
- Announcements: [t.me/madgercoin](https://t.me/madgercoin)
- Community: [t.me/madgerburrow](https://t.me/madgerburrow)
- Contact: [madgercoin@gmail.com](mailto:madgercoin@gmail.com)

## Future Decisions

The repository does not yet verify the following. Contributors and AI assistants must not invent answers:

- Final token contract, launch method and date, supply confirmation, allocations, vesting, authorities, liquidity structure, and treasury/operations wallet controls.
- Project ownership, maintainer approval policy, community governance, contribution licensing, code license, brand-asset usage rights, and a vulnerability-reporting contact/process.
- Analytics, monitoring, automated tests, CI requirements, release environments, custom-domain ownership procedures, and formal availability targets.
- The scope, sequencing, compliance requirements, custody model, supported assets/regions, vendors, and security architecture for real-world crypto payments or any other utility.
- Whether to remove the excluded Astro starter or adopt a maintained application/content architecture when the static site no longer meets project needs.
