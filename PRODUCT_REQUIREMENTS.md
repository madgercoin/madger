# Product requirements

## Purpose

The website is MADGER's canonical public information and safety surface. It must present the Honey Badger brand professionally, grow The Burrow, and prevent confusion between a minted token and a public trading launch.

## Required user outcomes

Visitors must be able to:

1. Understand that MADGER is a community-driven Solana memecoin.
2. See that it is minted but not publicly launched for trading.
3. locate and copy the exact official mint `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`;
4. understand that a mint does not prove trading availability and cross-check official channels;
5. read the litepaper, roadmap, risk language, and community links without receiving purchase guidance;
6. use core content and controls across mobile/desktop, keyboard, reduced motion, and assistive technology.

## Content constraints

Public content must not announce or imply an unverified launch date, liquidity pool, exchange listing, price outcome, return, partnership, supply finality, allocation, authority state, or completed utility. Future crypto-payment utility must always be labeled a vision subject to feasibility, security, accessibility, operations, and compliance.

## Technical constraints

Retain the static root architecture, explicit build allowlist, no runtime backend, minimal JavaScript, existing headers, responsive design, and approved assets. Core verification content must remain usable if clipboard access fails.

## Acceptance criteria

The mint matches the authoritative value everywhere; status is consistent in visible content and metadata; copy feedback uses an `aria-live` status; no purchase link exists; official links are exact; internal references resolve; `dist/` contains only approved public artifacts; release checks pass.

## Future Decisions

Analytics and success metrics, localization, content management, user accounts, payments, wallet functionality, commerce flows, and community publishing are not currently approved requirements.
