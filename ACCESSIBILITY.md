# Accessibility standard

## Target

Production changes target WCAG 2.2 AA. Accessibility is a release requirement, not deferred polish.

## Current provisions

The homepage uses semantic header/nav/main/section/footer structure, a skip link, native links/buttons/details, meaningful or intentionally empty image alternatives, menu `aria-expanded`, an `aria-live` clipboard result, responsive reflow, visible focus behavior, and reduced-motion CSS. The mint remains visible/selectable without JavaScript.

## Required checks

- Navigate every interactive element by keyboard in logical order; verify focus visibility and menu state.
- Test 320px reflow and 200% zoom without two-dimensional scrolling.
- Verify normal text at 4.5:1 and large text/non-text UI at 3:1.
- Check headings, landmarks, link purpose, image alternatives, status announcements, and native details with a screen reader after related changes.
- Test `prefers-reduced-motion: reduce`, touch targets around 44px, litepaper print, long mint wrapping, and clipboard failure messaging.
- Do not convey trading status by the gold dot alone; text carries the status.

## Content

Use plain language. Never make safety-critical content depend solely on humor, color, animation, image text, hover, or copying. The complete official mint must be readable and character-verifiable.

## Future Decisions

Formal accessibility owner, supported assistive-technology matrix, automated tooling/CI thresholds, independent audit cadence, accessibility statement/contact, and accommodation response process remain undefined.
