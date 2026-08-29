# SEO and discovery strategy

## Primary objective

Make `madgercoin.com` the unambiguous canonical source for MADGER identity, official Solana mint verification, project status, safety information, litepaper, and verified community channels. Discovery must never imply that public trading, a liquidity pool, an exchange listing, or purchase instructions are available when they are not.

## Search intent architecture

The site serves three high-confidence intent groups:

1. **Brand and identity:** MADGER, MADGER coin, Honey Badger memecoin, MADGER community, The Burrow.
2. **Verification and safety:** official MADGER mint, MADGER Solana address, MADGER launch status, verified MADGER channels.
3. **Project research:** MADGER litepaper, MADGER token framework, MADGER roadmap, MADGER risk disclosure.

Copy should answer these intents naturally. Do not create thin doorway pages or repeat keywords mechanically. New indexable pages require distinct search intent, useful original content, unique metadata, internal links, and sitemap inclusion.

## Implemented technical controls

- The apex HTTPS origin is canonical; `www` redirects to the apex.
- `/index.html` permanently redirects to `/`.
- `/litepaper` and `/litepaper/` permanently redirect to `/litepaper.html`.
- Every indexable page has one absolute canonical URL, unique title and description, explicit index directives, complete Open Graph/X cards, and crawlable semantic HTML.
- The custom 404 returns HTTP 404 plus HTML and HTTP `noindex` directives.
- `robots.txt` allows crawling and advertises the XML sitemap.
- `sitemap.xml` contains only canonical indexable pages with accurate `lastmod` and image discovery data.
- Homepage JSON-LD defines the MADGER Organization, WebSite, and WebPage entities.
- Litepaper JSON-LD defines its WebPage, Article, and BreadcrumbList relationships.
- The CSS hero image is preloaded at high priority because it is the likely Largest Contentful Paint resource.
- Informative images have descriptive alternatives; rendered images include intrinsic dimensions to reduce layout shift.
- Server security headers, deterministic static builds, explicit publish allowlists, and CI validation protect crawl quality and public trust.

## Content and entity rules

Use “MADGER,” “Solana,” “official mint,” “Honey Badger,” “The Burrow,” and “minted but not publicly launched for trading” only where they answer the page's purpose. Never add speculative price targets, “buy now,” unsupported exchange names, liquidity claims, countdowns, fake partnerships, or guaranteed utility.

Structured data must match visible content and verified facts. Do not add Product, Offer, FinancialProduct, review, rating, event, or token-market markup without corresponding public facts and a dedicated review.

Official identity must remain consistent across the website, X, Instagram, Facebook, YouTube, TikTok, Reddit, Telegram, listing submissions, and press materials. The verified Reddit identity is `u/Madgercoin` at `https://www.reddit.com/user/Madgercoin/`. The official mint is `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`.

Add a Discord URL to visible pages or structured data only after an authenticated administrator verifies the live server, durable invite, destination channel, invite permissions, moderation settings, and recovery owners. A guessed, expired, or personal-user invite is worse than no link because it creates an impersonation surface.

## Performance and media

Keep the site static and dependency-light. Do not add render-blocking third-party scripts solely for SEO. Preserve compressed WebP imagery, intrinsic image dimensions, the hero preload, immutable versioned asset caching, reduced-motion support, and mobile-first layout behavior.

Social previews use the dedicated 1200×630 `madger_social_share_v8.jpg` branded export with explicit dimensions and alternative text. The homepage also exposes the descriptive, tightly framed mascot portrait through a standard `<img>` element and image sitemap entry.

## Release checks

CI must validate:

- one canonical per indexable page and canonical/sitemap parity;
- unique, descriptive title and meta description lengths;
- complete Open Graph and X metadata;
- valid JSON-LD;
- explicit image dimensions;
- valid internal links and fragment targets;
- 404 no-index behavior;
- permanent canonical redirects in deployment tests;
- the exact official mint and absence of conflicting mint-like values;
- successful 200/301/404 responses and required security headers.

## External activation and measurement

Repository changes cannot establish search-engine ownership. The operational follow-up is:

1. Verify the `https://madgercoin.com/` domain property in Google Search Console.
2. Submit `https://madgercoin.com/sitemap.xml` and request inspection of the homepage and litepaper.
3. Verify Bing Webmaster Tools and submit the same sitemap.
4. Establish privacy-conscious first-party or Cloudflare analytics.
5. Record weekly branded impressions, non-branded impressions, indexed pages, clicks, click-through rate, average position, crawl errors, Core Web Vitals, and referrals from official social channels.
6. Annotate launch-state changes and major content releases so discovery changes can be interpreted correctly.
7. Track Reddit profile/community referrals separately from Discord invite joins; do not treat subscribers, members, or raw joins as proof of healthy participation.

Search Console, Bing ownership, analytics tokens, and platform preview-cache refreshes remain external account operations and must not be fabricated in source code.
