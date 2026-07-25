# SEO and discovery strategy

## Goals

Make `madgercoin.com` the clear canonical source for MADGER identity, official mint verification, project status, safety information, litepaper, and official channels. Discovery must not imply that public trading is available.

## Current implementation

`index.html` includes canonical, description, Open Graph, X card, and `WebSite` JSON-LD metadata. `litepaper.html` has canonical and description metadata. `robots.txt` allows crawling and references `sitemap.xml`, which lists the homepage and litepaper. The X banner is the social image.

## Content rules

Use “MADGER,” “Solana,” “official mint,” and “minted but not publicly launched for trading” naturally and consistently. Never add speculative price, “buy,” exchange, liquidity, countdown, or guaranteed-utility keywords. Structured data must describe only verified identity and channels; token/financial schema should not be added without validated facts and review.

## Release checks

Validate one canonical per indexable page, absolute production URLs, unique descriptive titles/descriptions, social preview crops, valid JSON-LD, sitemap parity, successful 200/404 responses, and absence of legacy starter routes from deployment.

## Future Decisions

Search-console ownership, analytics, target queries, locale strategy, additional schema types, content publishing, redirect policy, and measurable discovery goals are not established.
