# Instructions for AI coding assistants

## Read first

Read `PROJECT_CONTEXT.md`, `README.md`, `PRODUCT_REQUIREMENTS.md`, `SYSTEM_ARCHITECTURE.md`, `SECURITY.md`, `ACCESSIBILITY.md`, and the files relevant to the requested change. Inspect implementation before editing; documentation does not override observable code unless an authoritative product fact says otherwise.

## Non-negotiable facts

- Name: MADGER; proposed ticker: `$MADGER`; network: Solana.
- Official mint: `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`.
- Status: minted, not publicly launched for trading.
- Never describe the mint as undeployed or unannounced, and never imply trading is available.
- Do not invent launch timing, liquidity, listing, price, return, partnership, allocation, authority, or completed utility claims.
- Practical crypto payments are a future vision, not a current capability.

## Working rules

1. Modify root static files for production. Do not implement production work in excluded `src/` or `public/` Astro starter files.
2. Keep internal Markdown/TXT documentation out of `build.mjs`.
3. Preserve the approved brand assets and ink/bone/gold system. Prefer semantic HTML, native controls, progressive enhancement, and zero new client dependencies.
4. Reproduce the mint by copy/paste and verify exact equality after edits. Never shorten it in safety-critical text.
5. Keep status, metadata, structured data, homepage, FAQ, litepaper, and official links consistent.
6. Treat financial and custody ambiguity as a blocker; otherwise place unknowns under **Future Decisions**.
7. Run `npm ci`, `git diff --check`, `npm run build`, `npm run check`, reference/link checks, and inspect `dist/` before committing.
8. Update `CHANGELOG.md` and relevant documentation with behavioral changes.

## Security prohibitions

Never commit secrets, seed phrases, private keys, private wallet details, credentials, or unapproved addresses. Do not add purchase flows, wallet connections, analytics, forms, or third-party scripts without explicit requirements and security/privacy review.

## Future Decisions

Ownership, mandatory reviewers, automated checks, and AI-specific approval boundaries beyond the rules above have not been defined.
