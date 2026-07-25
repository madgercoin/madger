# MADGER public-launch control document

**Authority:** This is the launch index and command document. Detailed procedures live in the linked runbooks. It authorizes no transaction, launch, publication, authority change, or listing by itself.

## Immutable launch facts

| Item | Verified value |
|---|---|
| Network / token | Solana / MADGER |
| Official mint | `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv` |
| Supply / decimals / transfer tax | 1,000,000,000 / 6 / 0% |
| Current state | `MINTED_NOT_TRADING` |
| Website | https://madgercoin.com |

The target allocation is liquidity 60% (600,000,000), treasury 20% (200,000,000), community 10% (100,000,000), operations 7% (70,000,000), and creator reserve 3% (30,000,000). These are target balances, not transfer authorization.

## Command chain and gates

1. Resolve and document every item in [`LAUNCH_DECISIONS.md`](LAUNCH_DECISIONS.md). Unresolved means **STOP**.
2. Assign distinct launch commander, transaction proposer, transaction verifier/approver, communications owner, monitoring owner, and incident lead; record alternates.
3. Complete the [launch runbook](docs/launch-runbook.md), [wallet controls](docs/wallet-operations.md), liquidity-method review, legal/compliance review, rehearsal, and independent mint/authority/metadata verification.
4. At the recorded go/no-go meeting, each owner signs the checklist. The launch commander may say GO only with unanimous required approvals and no stop condition.
5. Execute approved transfers using the wallet runbook; never paste an address from chat. Record signatures and independently reconcile balances.
6. Create liquidity only under the approved method/budget/valuation/LP policy. This repository does not choose or execute that action.
7. Verify finalized on-chain state and independent RPC/explorer visibility before changing the website to `TRADING_LIVE` or publishing the prepared communications.
8. Monitor through T+72 hours, reconcile records, and publish factual updates. Listing submissions are post-launch requests, never promises.

## Control documents

- [`docs/launch-runbook.md`](docs/launch-runbook.md): timeline, gates, monitoring, incidents, rollback, stop rules.
- [`docs/liquidity-plan.md`](docs/liquidity-plan.md): options and mechanics; no selected method or invented budget.
- [`docs/wallet-operations.md`](docs/wallet-operations.md): wallet purposes, custody, records, and prohibitions.
- [`docs/launch-communications.md`](docs/launch-communications.md): embargoed drafts.
- [`docs/listing-submissions.md`](docs/listing-submissions.md): post-launch evidence and submission preparation.

## Non-negotiable stop conditions

Stop before the next action if any fact/address differs, approval or signer is missing, simulation fails, balance/decimals/authority differs, RPCs disagree, systems or official accounts may be compromised, required legal review is incomplete, market inputs exceed approved tolerances, communications are leaking early, or monitoring/incident owners are unavailable. Never “fix forward” with an unreviewed transfer. The safe state is `MINTED_NOT_TRADING` or `PAUSED_OR_DELAYED`.
