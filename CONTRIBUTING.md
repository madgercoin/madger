# Contributing to MADGER

MADGER welcomes careful community contribution. Professionalism, factual accuracy, maintainability, accessibility, security, performance, and long-term sustainability outweigh speed.

## Workflow

1. Read `PROJECT_CONTEXT.md`, `README.md`, `AI_INSTRUCTIONS.md`, and domain-specific docs.
2. Work in root production files; the obsolete Astro starter has been removed.
3. Keep changes focused and preserve branding. Put unknown product facts under **Future Decisions**.
4. For public status content, reproduce the exact mint `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv` and say “minted but not publicly launched for trading.”
5. Treat `LAUNCH_PLAN.md` as the launch-control index. Do not change `launch-state.js`, expose an embargoed draft, add a trading link, move funds, or represent a founder decision without its recorded authorization and required reviews.
6. Update tests/checklists and `CHANGELOG.md` with the implementation.
7. Run `npm ci`, `git diff --check`, `npm run check`, `npm run validate`, and `npm audit`; complete visual/accessibility QA as applicable. (`npm run check` includes the build.)
8. Submit a reviewable commit/PR describing exact files, user impact, tests, warnings, unresolved decisions, and mint verification.

## Content and code standards

Use semantic dependency-free HTML/JavaScript where practical; keep keyboard and no-JavaScript content usable; never add financial hype, purchase instructions, secrets, private wallet information, or unverified claims. New dependencies, services, tracking, wallet connections, or payment behavior require explicit justification and security/privacy review.

## Reporting problems

The repository does not verify issue templates, a public tracker, contributor agreement, or formal security disclosure channel. Do not publish exploitable details or credentials; use approved private maintainer contact when available.

## Future Decisions

Code/asset/contribution licensing, contributor agreement, review owners, branch rules, issue/PR templates, code of conduct, release authority, and security reporting process remain undefined.
