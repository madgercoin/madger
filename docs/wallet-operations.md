# Wallet operations and custody controls

No secret, private key, seed phrase, signing export, or recovery material belongs in this repository, tickets, chat, screenshots, transaction records, or cloud notes.

## Public wallet register and permitted use

| Role | Address | Permitted use |
|---|---|---|
| Creator | `GWyajcELd3nM1NtfvkJoXz2AgYYinqyZzqAC4NQyBzsi` | Initial custody and the approved 3% creator reserve; approved allocation transfers only |
| Treasury | `Ge91NeKSg4uYci29mq2XN5N4KQsnoXtkWBPEorPa63aZ` | 20% long-term treasury; approved project obligations |
| Operations | `C29Y6p3NXgi5UauC3W9PVN7SDguk9EA2e5oDDJEHRxNz` | 7% approved operating expenses and required fee reserve |
| Liquidity | `ATFELs8fV9CthKDjVLfhMb756uD499nHVtzLr5i7XKPp` | 60% allocation and approved liquidity provisioning/LP custody only |
| Community | `EVSB7eT5ws43oi2ztWKNQvH4THXQD3k9z6Sk9NNFP1FT` | 10% approved community programs with eligibility and distribution records |

Percentages are target allocations, not permission to transact. Do not commingle roles, use wallets for personal activity, loans, wash trading, undisclosed market support, giveaways without rules, or any unapproved program.

## Separation, backup, and execution

- Use hardware-backed or appropriately governed multisignature custody. One person must not both propose and approve. A separate verifier compares destination, mint, token account owner, amount, decimals, fee, recent blockhash, and instructions against the signed authorization.
- Keep signing devices and recovery backups offline in separate tamper-evident, access-controlled physical locations. Test recovery with a non-production rehearsal; log access without recording secrets. Maintain named primary/alternate custodians and succession procedures privately.
- Begin with a separately approved minimal test transfer. Require finalized confirmation and independent balance reconciliation before a batch. Re-read addresses from this register character-by-character and by cryptographic tooling; never use clipboard history, DMs, or address-book labels alone.
- Use dedicated, patched devices and trusted RPC endpoints. Decode every instruction before signing. Reject blind signing, unexpected delegate/authority changes, unlimited approvals, unknown programs, or extra instructions.

## Transaction record

Record: change/authorization ID; purpose; source/destination role and full public address; mint; base-unit and display amount; decimals; requested/proposed/verified/approved/executed UTC times; proposer/verifier/approvers; decoded instruction summary; simulation result; network/fee; wallet software and program IDs/versions; transaction signature; commitment/finalization; pre/post balances; independent explorer/RPC checks; exceptions; and evidence links/hashes. Records contain public transaction facts only.

Reconcile each wallet after every movement and daily through T+72. Investigate any mismatch; do not compensate with another transfer.

## Incident controls

On suspected key/device compromise, unexpected instruction, lost backup, unauthorized signature, or balance mismatch: stop signing; isolate devices; preserve logs; notify the incident lead through a verified channel; move no assets without a separately reviewed containment plan; rotate affected access; disclose only verified public facts. On-chain transfers cannot be rolled back.
