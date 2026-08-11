# Security policy and engineering guidance

## Security priorities

1. Protect the integrity of the official mint: `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv`.
2. Prevent false claims that public trading, liquidity, listings, or purchases are available.
3. Protect Cloudflare, repository, social-channel, email, and future wallet credentials.
4. Minimize client attack surface, data collection, and third-party dependencies.

## Current controls

The application is static and collects no user data. `_headers` sets CSP, HSTS, `nosniff`, strict-origin referrer policy, denies framing, and disables camera/microphone/geolocation. New-tab links use `noopener noreferrer`. The build publishes an allowlist and excludes internal docs, `.env*`, starter source, and package files. Clipboard enhancement writes only the fixed visible mint and handles denial without hiding the address.

CI scans high-confidence secret patterns, validates the production artifact and mint, and runs a production-only dependency audit. Wrangler is pinned at `4.120.1`; the current non-major update closes the newly disclosed development-tree `undici` advisory inherited through Miniflare. `npm audit` reports zero findings across the complete dependency tree.

The launch-state validator requires every indexable project page to load the same content-versioned controller, keeps `MINTED_NOT_TRADING` active, and rejects known trading hosts before launch. The no-index 404 is intentionally navigation-only and must not load the controller or repeat launch disclosures. Artifact validation proves launch-control documents and the five operational wallet addresses remain outside `dist/`. Public mint verification remains available; custody records and signing material never are.

## Contributor rules

Never commit seed phrases, keys, tokens, private wallet details, personal data, or unapproved addresses. Public operational addresses may appear only in the internal wallet runbook and transaction records, never the deployed artifact. Verify mint changes character by character and across official channels with multiple authorized reviewers. Avoid remote scripts, trackers, forms, wallet adapters, and dependencies unless threat-modeled and approved. Review generated `dist/` and Git diff for disclosure before release.

## Incident handling

For a false address/status or compromise, halt releases, roll back to a known-good artifact, preserve evidence, rotate affected credentials, correct all official channels, and document the incident without exposing secrets. Do not improvise financial guidance.

## Responsible disclosure

No dedicated vulnerability channel or response SLA is verified. The public project email is `madgercoin@gmail.com`, but it is not documented as a formal security intake.

## Future Decisions

Security contact/SLA, maintainer access controls, branch protection, signed releases, Cloudflare token scopes, wallet custody, independent audits, and payment threat models remain open.
