# Production design system

## Source of truth

`styles.css` is the implemented source. `VISUAL_QA.txt` defines review criteria. Root image assets are production assets; unused Astro placeholder images have been removed.

## Foundations

CSS custom properties define ink, panel, bone, sand, gold, moss, line, muted text, and a `1180px` maximum content width. Impact/Arial Narrow-style fonts carry display headings; the system UI stack carries body text. Rounded panels, restrained borders, gold emphasis, and generous spacing create the Burrow visual language.

## Components

- Fixed header with brand, desktop navigation/CTA, and a native mobile menu button.
- Gold primary and bordered ghost pill actions.
- Full-height hero with approved artwork and contrast gradients.
- Responsive trust, token, roadmap, social, FAQ, and footer patterns.
- Official mint safety panel with selectable `code`, native copy button, visible status, and non-JavaScript-readable address.
- Litepaper and 404 pages use standalone inline styles and the same palette.

## Breakpoints and motion

At `900px`, navigation and multi-column content simplify; at `600px`, cards and address controls stack. Fluid `clamp()` headings limit abrupt scaling. `prefers-reduced-motion: reduce` disables smooth scrolling, entrance animation, and transitions.

## Change rules

Reuse tokens/patterns, retain strong focus visibility and AA contrast, avoid unmeasured dependency or asset cost, test the matrix in `VISUAL_QA.txt`, and never alter mascot artwork merely to fit a component.

## Future Decisions

A normalized spacing/type scale, standalone shared styles for auxiliary pages, component tokens, responsive images, dark-only policy, automated visual regression, and patterns for future transaction/payment states remain open.
