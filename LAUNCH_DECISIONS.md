# MADGER launch decision register

Record each founder decision, approver, UTC timestamp, rationale, and supporting review before changing launch state or moving funds. A selected method or target time is not authorization to transact. Any item marked unresolved means **STOP** at the dependent gate.

## Recorded founder decisions

| Decision | Approved value | Approver | Recorded UTC | Evidence / limitation |
|---|---|---|---|---|
| Launch method | Direct MADGER/SOL Raydium CPMM liquidity pool | James Dean | 2026-08-26 | Founder confirmed CPMM in the launch-preparation conversation. This does not clear the current Raydium jurisdiction restriction or authorize a transaction. |
| Launch date and time | August 27, 2026 at 14:00 UTC | James Dean | 2026-08-26 | Consistent with the production countdown and founder instruction to use a worldwide UTC time. Publication remains conditional on all gates clearing. |

The August 27 target expired without a finalized pool. It is retained as historical evidence and is
not an active launch time. No replacement date may be inferred from this record.

## Verified authority state

Solana Explorer reports a fixed 1,000,000,000 supply. Independent raw mint inspection confirms mint-authority option `0` and freeze-authority option `0`; Metaplex metadata is immutable. No authority-revocation transaction remains.

## Unresolved approvals

1. **Compliant transaction path** — qualified confirmation that the selected venue/program may be used without a false jurisdiction representation.
2. **Liquidity budget** — exact SOL and MADGER amounts committed, including fee and priority reserve.
3. **Opening valuation** — approved initial price/fully diluted valuation and acceptable setup tolerance.
4. **LP policy** — custody, multisig/signers, permanent Burn & Earn lock or other approved treatment, and exact public disclosure.
5. **Allocation-transfer authorization** — approval to execute the target wallet movements and permitted batches.
6. **Emergency decision owners** — named go/no-go, pause, cancellation, communications, custody, monitoring, and incident owners plus alternates.
