# Playable MADGER — visual identity and source

This project must not replace MADGER with a generic badger, bear, panda, raccoon, or generated substitute mascot.

## Approved source images

- Full-body approved hero: mobile/assets/images/madger-mascot.webp (SHA-256 462D6DFC7F4EE2AC1EA78A3A527FE55890248F2A62E9B1A717E31A2E7F211D61).
- Browser copy: mobile/public/blackroot/assets/madger-official-face.webp. It must have **identical bytes**. The image is projected onto a curved 3D head rather than used as a flat gameplay sprite.
- Ten-pose reference: mobile/assets/images/madger-official-pose-card.jpg (SHA-256 9DD20738580497A7709C266BBBE0802A1D1777731E09B7BAD3B40836E04CCA6B).

## Required identity

Compact black furry biped; cream blaze between amber/gold eyes; angled brows and cream cheeks; cream chest and rear V; long bushy black/cream jagged tail; two arms and two legs; exactly five claws on each paw. No oversized projecting fang.

## Implementation and limits

The madger-hero.mjs prototype is a THREE.js 3D rig with dimensional torso, head, articulated limbs, clawed paws, textured face projection and chevron tail, responding to running, jumping and BURROW. Only the existing browser Overgrown scene replaces the generic runner; the deterministic physics, saved progress and earned companions remain untouched.

It is **not** yet a bespoke sculpted, rigged production GLB; exact photorealism and full 3D side-view facial likeness remain unverified. The native Android renderer is separate and has not inherited these changes. Do not describe this as completed professional character artwork.

Acceptance requires visual comparison of front/rear/side and action poses against the approved card; WebGL and gameplay regression; saved-run and three-chamber reload tests; and physical Android GPU/thermal/FPS evidence before an Android release. Do not spend paid-generation credits without explicit instruction.
