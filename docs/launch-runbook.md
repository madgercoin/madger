# Public-launch runbook: T−7 days to T+72 hours

All times are UTC relative to the founder-approved launch time (`T`). Names, approvals, evidence, transaction signatures, and timestamps belong in the private launch record. This runbook never authorizes funds or irreversible actions.

## Timeline

### T−7 to T−4 days — control and rehearsal

- Freeze unreviewed scope. Approve all eight items in `LAUNCH_DECISIONS.md`; assign launch commander, custody proposer/verifier/approvers, communications, monitoring, incident, and legal owners plus alternates.
- Independently verify mint, supply `1,000,000,000`, decimals `6`, transfer tax `0%`, metadata, authorities, wallet addresses, token-account ownership, and balances using two trusted sources/RPCs.
- Review chosen venue's current official documentation/program IDs and simulate every decoded instruction. Rehearse with non-production assets; test signer availability, recovery, monitoring, website deployment/rollback, and communications embargo.
- Approve a numbered movement schedule and reconciliation sheet. Verify secure devices, backups, RPC fallback, SOL fee reserve, status page, private bridge, and incident contacts.

### T−3 to T−1 days — freeze and final verification

- Freeze website/config/content and record candidate commit/artifact hash and known-good rollback SHA. Proofread all embargoed copy; ensure it says trading is unavailable until verified live.
- Confirm approved method, budget, valuation/tolerance, LP policy, date/time, authority timing, transfer authorization, and emergency owners. Obtain required technical/legal/compliance sign-offs.
- Run full CI, secret scan, dry-run deployment, link/status checks, and a transaction rehearsal. Schedule staffed monitoring through T+72. Do not pre-publish venue links or buying instructions.

### T−24 hours to T−1 hour — preflight

- Reconfirm official-account access through independent channels; restrict posting rights and remove stale sessions. This includes the website, X, Telegram, Instagram, Facebook, TikTok, the verified Reddit identity/community, and the verified Discord server if active. Check domain/DNS/hosting health.
- Compare full addresses and instruction data against the approved record. Recheck balances, priority-fee conditions, Solana health, venue availability, clock sync, and simulations.
- Prepare but do not sign transactions until their authorized window. The launch commander records preliminary GO/NO-GO; any stop condition is NO-GO.

### T−60 to T−5 minutes — go/no-go

Each owner verbally and in writing reports: approvals complete; facts match; signers and backups available; simulation clean; venue/RPC/website/channels healthy; monitoring and incident response staffed; communications staged; no compromise or leak. Launch commander records unanimous GO or chooses `PAUSED_OR_DELAYED`. Silence is not approval.

### T−5 minutes through verified live

1. Re-read decoded transaction, full mint/destination/program IDs, amounts/base units, decimals, price parameters, fee/slippage limits, authorities, and signers.
2. Proposer submits only the approved instruction; verifier and required approvers independently inspect it. Record signature immediately.
3. Wait for finalized confirmation using independent RPCs. Reconcile pre/post balances and pool vault/position ownership. Do not retry an ambiguous transaction until its signature/account state is resolved.
4. Verify the genuine pool, opening parameters, tradability, observed quote/slippage, LP ownership, authorities, metadata, and explorer visibility. A tiny approved verification action may occur only if separately authorized.
5. Only after verification, deploy `TRADING_LIVE`, smoke-test production, then publish simultaneous primary official-channel copy containing the exact mint and verified links. Record URLs/times. Adapt the same signed facts for Reddit and Discord only through their verified moderator/announcement surfaces; never paste a venue link into general chat before the website source is live.

### T+0 to T+6 hours

- Monitor confirmations, pool reserves/depth, price impact (not price targets), routes, LP custody, wallet balances, authorities, website uptime, impersonation, support reports, official account access, Reddit moderation queues, and Discord safety/moderation alerts continuously.
- Reconcile hourly and issue factual milestone/incident updates. Never promise listing, returns, or stability. Pin the safety warning and remove scams.

### T+6 to T+24 hours

- Maintain staffed alerting; review volatility, abnormal swaps, liquidity/position changes, RPC/venue errors, phishing and holder questions. Reconcile at T+12 and T+24. Prepare listing submissions only from verified live evidence.

### T+24 to T+72 hours

- Reconcile at least daily; confirm LP/authorities and every controlled-wallet change. Publish the prepared factual 24/48/72-hour updates. At T+72, hold a review, archive records/evidence, log incidents and follow-ups, and transfer monitoring to normal operations.

## Preflight record and go/no-go checks

Record owner, result, UTC time, evidence hash/link, exception, and second reviewer for: immutable token facts; all approvals; legal review; wallet custody/backup; exact transfer schedule; venue program/instructions; budget/valuation/LP constraints; simulations; network/venue/RPC health; fee reserve; website artifact/rollback; channel security; monitoring/alerts; incident bridge; communications; and scam moderation. Any unchecked or stale critical item is NO-GO.

## Wallet movements and transaction log

Use `docs/wallet-operations.md`. The target balances are: liquidity 600,000,000; treasury 200,000,000; community 100,000,000; operations 70,000,000; creator reserve 30,000,000 MADGER. Before calculating movements, inventory every current token account; transfer only the delta under explicit authorization. For each test/batch record authorization, proposer/verifier/approvers, source/destination, amount and base units, decoded instructions, simulation, fees, signature, commitment, independent checks, pre/post balances, and reconciliation. Never store signing material.

## Incidents, rollback, and stop conditions

**STOP immediately** for: mismatched mint/supply/decimals/tax/address/authority/metadata; missing or exceeded approval/budget/valuation/tolerance; unexpected instruction, signer, program, delegate, or balance; failed/changed simulation; ambiguous or duplicate transaction; custody/account compromise; unavailable owner/monitoring/rollback; RPC or explorer disagreement; Solana/venue/hosting/channel instability; communications leak or fake pool; legal/compliance hold; abnormal liquidity change; or inability to state facts confidently.

Incident lead classifies severity, opens the private bridge, preserves evidence, timestamps decisions, isolates compromised access, and assigns on-chain, web, communications, and community workstreams. Set the public state to `PAUSED_OR_DELAYED` when accurate. Publish only verified safety facts and the exact mint; never expose defensive details or speculate.

On-chain finality means asset transfers/pool creation/locks/burns/authority revocations cannot be rolled back. “Rollback” therefore means: stop further signing, resolve ambiguous signatures, revoke/rotate compromised off-chain access, restore the known-good website artifact and `MINTED_NOT_TRADING`/`PAUSED_OR_DELAYED` truth, withdraw/correct liquidity only if technically possible and explicitly pre-authorized, and communicate status. Never send a compensating transaction or change authority without fresh approval. Cancellation uses the cancellation draft; restart requires a new full go/no-go.
