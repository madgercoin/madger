# MADGER website

This repository is the production source for [madgercoin.com](https://madgercoin.com), the official home of MADGER: a professional, community-driven Solana memecoin represented by the Honey Badger.

MADGER's character is resilient, confident, determined, and attentive to detail. The product standard follows the character: quality before speed, facts before hype, and durable systems before short-lived trends. The long-term direction is to grow from a memecoin and character brand into a cryptocurrency ecosystem with practical utility, including real-world crypto payments when the project can support them responsibly. That direction is a vision—not a promise that a product, token, or utility currently exists.

> **Current verified status:** MADGER has been minted on Solana but has not yet been publicly launched for trading. The official mint is `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`. Its existence is not evidence of public trading, liquidity, or a listing; verify it through the official channels below.

## Documentation map

These files are the contributor source of truth. When implementation and documentation disagree, verify the implementation, correct the documentation in the same change, and call out any unresolved product decision.

- [`README.md`](README.md) — project purpose, repository architecture, contributor standards, and verified status.
- [`LAUNCH_PLAN.md`](LAUNCH_PLAN.md) — authoritative launch control index; its linked runbooks are internal source documents excluded from `dist/`.
- [`LAUNCH_DECISIONS.md`](LAUNCH_DECISIONS.md) — the eight founder approvals that remain required before launch actions.
- [`README_DEPLOY.txt`](README_DEPLOY.txt) — reproducible build, Cloudflare Workers deployment, rollback, and operations runbook.
- [`IMPLEMENTATION_CHECKLIST.txt`](IMPLEMENTATION_CHECKLIST.txt) — release gates for content, engineering, security, launch, and future utility.
- [`VISUAL_QA.txt`](VISUAL_QA.txt) — brand asset inventory and visual/accessibility review procedure.
- [`litepaper.html`](litepaper.html) — public-facing project status, verified mint, roadmap, and risk disclosure; it is a deployed page, not internal engineering documentation.
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md), and [`ROADMAP.md`](ROADMAP.md) — authoritative context, present requirements, and explicitly non-promissory direction.
- [`BRAND_GUIDELINES.md`](BRAND_GUIDELINES.md), [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), and [`UI_UX_GUIDELINES.md`](UI_UX_GUIDELINES.md) — brand and interface rules grounded in the current implementation.
- [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md), [`ASSET_MANIFEST.md`](ASSET_MANIFEST.md), [`SEO_STRATEGY.md`](SEO_STRATEGY.md), [`ACCESSIBILITY.md`](ACCESSIBILITY.md), and [`SECURITY.md`](SECURITY.md) — technical and quality reference material.
- [`AI_INSTRUCTIONS.md`](AI_INSTRUCTIONS.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`DEPLOYMENT.md`](DEPLOYMENT.md), and [`CHANGELOG.md`](CHANGELOG.md) — execution rules, contribution/release guidance, and change history.

## Production architecture

The production application is deliberately small and static:

| Area | Authoritative files | Responsibility |
| --- | --- | --- |
| Pages | `index.html`, `litepaper.html`, `404.html` | Semantic content, metadata, navigation, disclosures, and official links |
| Presentation | `styles.css` | Brand tokens, responsive layout, focus states, reduced-motion behavior, and component styling |
| Behavior | `script.js` | UTC-based Daily Dig copy, current footer year, and accessible mobile-navigation state |
| Brand assets | Root-level `madger_*` images and `favicon.png` | Approved production imagery copied to `/assets/` at build time |
| Web metadata | `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers` | Install metadata, crawler discovery, canonical URLs, security headers, and cache policy |
| Build | `build.mjs`, `site-config.mjs` | Clears `dist/` and copies the centralized explicit allowlist without transformation |
| Launch state | `launch-state.js` | Defines the four allowed public states and keeps `MINTED_NOT_TRADING` active across every public page |
| Validation | `scripts/`, `.github/workflows/ci.yml` | Maintained content, artifact, syntax, secret, dependency, and Cloudflare checks run on every PR to `main` and push to `main` |
| Hosting | `wrangler.json` | Cloudflare Workers Static Assets configuration, trailing-slash handling, and the custom 404 page |

`dist/` is generated and ignored. Do not edit it. The explicit arrays in `site-config.mjs` are a deployment boundary: adding a source file does **not** publish it unless it is also added to the appropriate allowlist.

### Removed Astro starter

The unused `src/`, `public/`, Astro-based `tsconfig.json`, and generated Worker declaration were removed after confirming that Astro was not installed, configured, built, or published. Production work belongs in the root static files. Do not reintroduce a framework without an explicit architecture review.

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

`npm run check` rebuilds and runs `wrangler deploy --dry-run`. Run `npm run validate` for syntax, internal-link, unique-ID, JSON-LD, mint, dist-allowlist, and secret-pattern checks. Only environment-injected proxy notices are expected locally.

## Making a change

1. Start from a clean branch and read all four documentation files.
2. Confirm the statement or behavior in current production files. Launch work must follow `LAUNCH_PLAN.md`; do not infer treasury, liquidity, legal, payment, or governance decisions.
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
- **Reliability:** use pinned dependencies, deterministic builds, preview before production, validate official links and claims, and retain a known-good deployment for rollback. CI is required on PRs to and pushes on `main`.
- **Sustainability:** adopt a framework, service, wallet integration, analytics product, or payment provider only when its ongoing operational burden and user benefit are understood.

## Official channels

Only these endpoints are verified by the current repository:

- Website: [madgercoin.com](https://madgercoin.com)
- X: [@madgercoin](https://x.com/madgercoin)
- Instagram: [@madgercoin](https://www.instagram.com/madgercoin/)
- Facebook: [Madger Coin](https://www.facebook.com/share/1LEM9iUfP2/)
- Announcements: [t.me/madgercoin](https://t.me/madgercoin)
- Community: [t.me/madgerburrow](https://t.me/madgerburrow)
- Contact: [madgercoin@gmail.com](mailto:madgercoin@gmail.com)

## Future Decisions

The repository does not yet verify the following. Contributors and AI assistants must not invent answers:

- Founder approvals enumerated in `LAUNCH_DECISIONS.md`; no allocation transfer or launch action is authorized by the documentation package.
- Project ownership, maintainer approval policy, community governance, contribution licensing, code license, brand-asset usage rights, and a vulnerability-reporting contact/process.
- Analytics, monitoring, release environments, custom-domain ownership procedures, and formal availability targets.
- The scope, sequencing, compliance requirements, custody model, supported assets/regions, vendors, and security architecture for real-world crypto payments or any other utility.
- Whether to adopt a maintained application/content architecture when the static site no longer meets project needs.
