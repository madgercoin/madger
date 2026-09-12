# The Burrow app product review

## Objective

Turn MADGER's existing safety, contribution, creator, and transparency work into one useful mobile-first product without introducing custody, financial promises, or a dependency-heavy application stack.

## Iterative evaluation

### Review 1 — combined companion concept: 8.4/10

Strengths: strong project fit, broad utility, and reuse of shipped content. Weaknesses: excessive scope, unclear first action, potential wallet-security burden, and no coherent retention loop.

Revision: exclude custody, swaps, token rewards, accounts, and governance. Center the product on five verbs: verify, learn, contribute, create, and inspect.

### Review 2 — safety and missions PWA: 9.2/10

Strengths: clear differentiation, low-risk delivery, public access, and useful repeat visits. Weaknesses: disconnected tools, insufficient character presence, and progress could imply a server account.

Revision: create a single field-console navigation model, make verification the primary action, use only approved character art, state that progress remains on-device, and treat mission completion as a private checklist rather than proof of acceptance or compensation.

### Review 3 — release candidate: 9.7/10

Strengths: focused journeys, premium identity, responsive layout, accessible progressive enhancement, privacy-first persistence, and explicit safety language. Weaknesses found during audit: unsupported HTTP methods on the bundled app route, offline fallback could return HTML for a missing asset, the app was absent from sitemap validation, and initial screenshots captured during the entrance animation.

Revision: enforce GET/HEAD, limit the offline document fallback to navigation requests, add the app to canonical/SEO validation, and wait for settled animation during visual QA.

### Final review — release: 9.9/10

The release meets the achievable quality bar for a static v1: it has one primary task, five coherent modules, no wallet or secret handling, no remote data collection, approved identity art, local-only progress, semantic controls, reduced-motion support, responsive navigation, canonical metadata, an offline shell, and deployment validation. A literal 10/10 is intentionally not claimed because production user research, assistive-technology testing across devices, threat review by an independent party, and real usage data remain future evidence.

### Post-review polish

A subsequent adversarial review found four remaining weaknesses: domain recognition could be mistaken for account verification, the verifier did not submit from the keyboard, self-checked missions could be confused with accepted work, and JavaScript failure hid secondary resources.

The release now labels recognized platforms as explicitly unverified, supports form submission with Enter, calls local mission state a private checklist rather than completion proof, exposes all resources when JavaScript is disabled, reports offline readiness, and offers installation only when the browser confirms support. The production checker also covers the app shell, canonical redirects, privacy boundary, exact mint, secret warning, and approved character reference.

The first publication attempt also exposed a pre-existing platform limit: the contest outro exceeded Cloudflare's per-file asset ceiling. It was recompressed with the same 1280×720 presentation, H.264/AAC compatibility, and 12-second duration, reducing it from 6.5 MB to 2.1 MB. A subsequent upload completed successfully. The authorized `madgercoin.com` account still requires its Cloudflare credential to promote this build to the canonical domain.

## Release sequence

1. Publish the static PWA and measure whether users choose verification, missions, learning, creator tools, or the proof ledger.
2. Improve content and workflows based on observed friction before adding accounts.
3. Add optional non-custodial identity only when contribution history needs cross-device persistence.
4. Add transaction features only after legal review, threat modeling, independent security review, support ownership, and demonstrated demand.
