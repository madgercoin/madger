# Reddit and Discord community blueprint

This document converts MADGER's contribution-first community standard into platform controls. It does not authorize a token launch, trading link, paid promotion, moderator appointment, or wallet action. The public launch state remains `MINTED_NOT_TRADING`.

## Canonical identity gates

| Platform | Current verified identity | Publication gate |
| --- | --- | --- |
| Reddit | `https://www.reddit.com/user/Madgercoin/` | The profile may be linked now. Link `r/madgercoin` only after the authenticated account visibly owns the created community. |
| Discord | Authenticated account/server verification pending | Publish one durable server invite only after owner access, recovery ownership, destination, permissions, safety controls, and invite behavior are checked. |

Record the verification date, reviewer, full URL, account/server owner, recovery owner, and screenshot/evidence reference in the private channel registry. Recheck after any username, ownership, moderation, or invite change.

## Reddit community design

### Positioning

**Title:** MADGER: The Honey Badger Burrow on Solana

**Purpose:** A discussion-first home for original MADGER art, lore, build notes, constructive critique, Solana safety, and community proposals. It is not a price room, raid hub, referral funnel, or substitute for the official website.

### Launch sequence

1. Create the exact permanent name only from the verified account.
2. Configure public visibility, open text/link/media submissions, moderator-only wiki editing, platform discovery, and user reporting.
3. Publish six rules before outreach: contribute with context; no financial promises; no raids/vote manipulation; no impersonation or wallet solicitation; critique ideas rather than people; disclose affiliations.
4. Add post flair: `Build Log`, `Original Art`, `Meme & Lore`, `Question`, `Community Proposal`, `Safety`, and `Official Update`.
5. Publish and pin the welcome and verification threads. Pin only one additional timely thread so the front page stays alive.
6. Seed three discussion-worthy posts before external promotion.
7. Invite moderators only after sustained public contribution and a least-privilege review.

### First three threads

1. **Welcome to r/madgercoin — what should The Burrow build together?** Explain the status, exact mint, rules, and ask members to choose one contribution lane.
2. **Verification desk: the exact MADGER mint and how to spot copycats.** Link back to `madgercoin.com`; do not include trading routes.
3. **Burrow Workshop #1: give MADGER a seven-second scene.** Ask for the first frame, the punchline, and what makes it recognizably MADGER.

### Moderation baseline

- Enable Reddit's native reputation/safety filters at a level proportional to observed abuse; do not silently require manual approval of every legitimate post.
- Use removal reasons that explain the violated rule and how to repost successfully.
- Lock rather than delete an official incident thread when preserving context matters.
- Report credible impersonation, threats, or prohibited transactions through the platform and preserve URLs, timestamps, and screenshots privately.
- Never use moderator status to pressure external communities for promotion.

## Discord server design

### Minimum channel architecture

```text
START HERE
  #start-here
  #rules-and-safety
  #official-links
  #announcements

THE BURROW
  #general-burrow
  #memes-and-lore
  #build-in-public
  #ideas-and-feedback

HELP
  #scam-reports
  #help-desk

MODERATION (private)
  #mod-briefing
  #incident-log
```

Avoid adding channels until conversation volume proves they need a separate home. Empty architecture makes a young server feel abandoned.

### Roles and permissions

| Role | Purpose | Permission rule |
| --- | --- | --- |
| `Burrow Keeper` | owner/recovery owner | At least two secured accounts; use Administrator only where unavoidable. |
| `Tunnel Guard` | trusted moderator | Moderate messages and members; no billing, server ownership, integration, or broad role management. |
| `Builder` | recurring project contributor | No moderation or administrative permissions. |
| `Artist` | verified original creative contributor | No moderation or administrative permissions. |
| `Lorekeeper` | helpful explainer/archivist | No authority to make launch or financial claims. |
| `Early Digger` | early participant recognition | Cosmetic only; never implies allocation, compensation, whitelist, or financial entitlement. |

Bots receive only the permissions needed for one documented job. Record bot owner, scopes, data access, removal procedure, and fallback before installation.

### Safety and onboarding

- Enable Community mode, verified-email participation, explicit-media scanning, raid alerts/protection, and a moderator-only Discord updates channel.
- Use Community Onboarding and a short Server Guide: read the rules, verify official links, introduce yourself, then choose `Builder`, `Artist`, `Lore`, or `Here for the memes` interests.
- Default everyone into `#start-here`, `#rules-and-safety`, `#official-links`, `#announcements`, `#general-burrow`, `#scam-reports`, and `#help-desk`; add other channels through interest choices.
- Disable `@everyone` and broad role mentions. Restrict announcement posting, webhook creation, invite management, and bot installation.
- Pin the exact mint and `MINTED_NOT_TRADING` status in `#official-links`. State that staff never request seed phrases, private keys, remote access, or verification transfers.

### Welcome copy

> Welcome to The Burrow. Pick a lane—build, draw, write lore, make something funny, or ask a sharp question. MADGER is minted on Solana but is not publicly trading. Verify the exact mint and every official link at https://madgercoin.com. Mods never DM first for funds, wallet access, seed phrases, or “verification.” What are you here to make better?

### Recurring programming

- **Burrow Briefing:** a concise weekly build log with decisions, evidence, and one open question.
- **Workshop:** one-hour critique room for art, clips, copy, lore, or documentation.
- **Ask a Keeper:** staffed office hours for project and safety questions; unanswered questions become FAQ candidates.
- **Show Your Dig:** member showcase with creator credit and explicit permission before cross-posting.

## Cross-platform routing

The website is the identity source; Telegram is the announcement source; Reddit is the durable public discussion layer; Discord is the high-context collaboration layer. Cross-link only where it helps someone choose the right room. Never mirror every post everywhere, use mass DMs, manufacture replies, or coordinate votes.

Measure meaningful actions: first contribution, second-week return, questions resolved, artifacts shipped, and members who help another member. Follower, subscriber, and server-member totals are context, not success by themselves.
