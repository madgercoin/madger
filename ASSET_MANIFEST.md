# MADGER asset manifest

All published files below use the single approved black, charcoal, cream, bronze, and gold MADGER identity. `site-config.mjs` is the authoritative publication list.

| Source | Public path | Approved use |
| --- | --- | --- |
| `madger_v5_icon.png` | `/assets/madger_v5_icon.png` | Browser and manifest icon |
| `madger_v5_hero.webp` | `/assets/madger_v5_hero.webp` | Homepage hero and social preview |
| `madger_v5_official_logo.webp` | `/assets/madger_v5_official_logo.webp` | Navigation logo and canonical coin emblem |
| `madger_v5_mascot.webp` | `/assets/madger_v5_mascot.webp` | Full-body Meet MADGER artwork |
| `madger_v5_profile.webp` | `/assets/madger_v5_profile.webp` | Community card, footer avatar, and 404 |
| `madger_v5_graphics.webp` | `/assets/madger_v5_graphics.webp` | Approved character-pose reference plate |

## Retained non-published collateral

`favicon.png`, `madger_brand_board.jpg`, `madger_hero.jpg`, `madger_round_icon.png`, `madger_wallet_icon.png`, and `madger_x_banner.png` are retained source or social collateral. The website build does not copy them, and contributors must not advertise `/assets/` URLs for them. Three corrupted superseded PNG exports were removed; their reviewed v5 replacements above are canonical.

## Canonical mascot

The canonical mascot is a cute, trustworthy, permanently unimpressed 3D Honey Badger with black-and-white fur, warm cream details, a white lightning/zigzag forehead stripe, large round eyes, puffier cheeks, short thick arms, reduced claws, crossed arms, and a tiny fang. It has no clothes, sunglasses, chain, or medallion.

## Handling

Preserve aspect ratio, full coin borders, safe margins, original expression, and color. Do not use source-board fragments as standalone production artwork. New variants must derive from the approved master and remain recognizable at their actual rendered size.

Because `/assets/*` uses long-lived caching, publish time-sensitive replacements under new filenames and verify the production deployment.

## Security

Never embed seed phrases, private keys, private wallet information, unapproved addresses, QR codes, misleading purchase instructions, price guarantees, or fabricated partnerships in brand artwork.
