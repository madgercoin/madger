# Playable MADGER — visual identity and source

This project must not replace MADGER with a generic badger, bear, panda, raccoon, or generated substitute mascot.

## Approved source images

- Full-body approved hero: mobile/assets/images/madger-mascot.webp (SHA-256 462D6DFC7F4EE2AC1EA78A3A527FE55890248F2A62E9B1A717E31A2E7F211D61).
- Browser copy: mobile/public/blackroot/assets/madger-official-face.webp. It must have **identical bytes**. The image is projected onto a curved 3D head rather than used as a flat gameplay sprite.
- Ten-pose reference: mobile/assets/images/madger-official-pose-card.jpg (SHA-256 9DD20738580497A7709C266BBBE0802A1D1777731E09B7BAD3B40836E04CCA6B).

## November 4 identity correction

The user-provided October 13 ten-pose card is the authoritative likeness reference for this continuation: `mobile/assets/images/madger-user-pose-card.png`, SHA-256 `7d911f2ce56ce3159a144b06d025b0eea93b6b358a14f764f42e68b0725c036c`. It is not the same artwork as the older bundled JPEG named `madger-official-pose-card.jpg`. In particular, the later card has a continuous jagged warm-tan crown-to-spine stripe, pointed cheek fur, shaped muzzle, planted clawed feet and a tapered chevron tail. The later instruction for small even teeth overrides the projecting fang shown in older artwork.

The November 4 phone screenshot exposed that the existing procedural model still read as a rounded substitute mascot and that adaptive resolution was visibly poor on a real phone. Improvements must be judged against actual front/rear/side/action renders, not model metadata alone.

## Required identity

Compact black furry biped; cream blaze between amber/gold eyes; angled brows and cream cheeks; cream chest and rear V; long bushy black/cream jagged tail; two arms and two legs; exactly five claws on each paw. No oversized projecting fang.

## Implementation and limits

The madger-hero.mjs prototype is a THREE.js 3D rig with dimensional torso, head, articulated limbs, clawed paws, textured face projection and chevron tail, responding to running, jumping and BURROW. Only the existing browser Overgrown scene replaces the generic runner; the deterministic physics, saved progress and earned companions remain untouched.

It is **not** yet a bespoke sculpted, rigged production GLB; exact photorealism and full 3D side-view facial likeness remain unverified. Android now bundles this same authored PBR renderer offline in its WebView. Build-specific native tests and screenshots remain necessary. Do not describe this as completed professional character artwork.

Acceptance requires visual comparison of front/rear/side and action poses against the approved card; WebGL and gameplay regression; saved-run and three-chamber reload tests; and physical Android GPU/thermal/FPS evidence before an Android release. Do not spend paid-generation credits without explicit instruction.
