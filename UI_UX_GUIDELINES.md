# UI and UX guidelines

## Principles

1. **Truth before conversion:** status and risks must be clearer than community calls to action.
2. **Verification before action:** show the complete mint and official cross-check channels; provide no purchase path while trading is unavailable.
3. **Progressive enhancement:** content works without JavaScript; clipboard behavior adds convenience and reports success/failure.
4. **Accessible by default:** semantic structure, native controls, keyboard access, visible focus, readable contrast, reflow, and reduced motion.
5. **Quality over speed:** resolve confusing states and edge cases before release.

## Mint experience

Label the value “Official Solana mint.” Keep it selectable and untruncated. State “minted but not publicly launched for trading” beside it. A copy action must have an accessible name, preserve focus, and announce its result without a modal. Clipboard failure must direct users to select/copy manually. Never follow copy with a wallet, swap, purchase, countdown, or price action.

## Responsive content

Protect long addresses with wrapping. Stack the address and copy control on small screens. Validate at 320px, around 390px, breakpoint boundaries, desktop, and 200% zoom. Navigation state must match `aria-expanded` and close after link selection.

## Error and trust language

Use direct recovery instructions and never blame users. Warnings identify impersonation, direct-message, look-alike-address, and premature-trading risks without sensationalism.

## Future Decisions

User research, localization, payment/merchant journeys, transaction states, wallet consent, support workflows, notifications, and quantitative usability targets are undefined.
