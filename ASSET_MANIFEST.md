# Asset manifest

## Published brand assets

| Source | Public path | Current use |
| --- | --- | --- |
| `favicon.png` | `/assets/favicon.png` | favicon and web manifest |
| `madger_hero.jpg` | `/assets/madger_hero.jpg` | homepage hero |
| `madger_full_logo.png` | `/assets/madger_full_logo.png` | Meet MADGER card |
| `madger_profile.png` | `/assets/madger_profile.png` | header, footer, 404 |
| `madger_round_icon.png` | `/assets/madger_round_icon.png` | community card |
| `madger_x_banner.png` | `/assets/madger_x_banner.png` | Open Graph/X image |
| `madger_wallet_icon.png` | `/assets/madger_wallet_icon.png` | reserved; not rendered |
| `madger_brand_board.jpg` | `/assets/madger_brand_board.jpg` | reference; not rendered |
| `madger_brand_guide.png` | `/assets/madger_brand_guide.png` | reference; not rendered |

`build.mjs` is authoritative for publication. Assets below `public/` belong to the excluded Astro starter and are not production.

## Handling rules

Preserve aspect ratio and safe margins. Optimize additions, use descriptive filenames, verify rights/provenance, add them to `build.mjs` only if public, and update references/documentation together. Because `/assets/*` is cached immutable for one year and filenames are not hashed, use a new filename for time-sensitive revisions.

## Security

Never store QR codes, screenshots, or artwork that embeds an unapproved address, credential, private wallet information, personal data, or misleading purchase instruction.

## Future Decisions

Asset ownership/licensing, canonical master files, checksums/dimensions, automated optimization, responsive variants, and removal of public reference/reserved assets require approval.
