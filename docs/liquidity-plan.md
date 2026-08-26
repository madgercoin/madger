# Liquidity methods for an already-minted Solana token

This comparison informs founder decisions. It does **not** authorize a budget, quote amount, opening valuation, lock, authority change, or transaction. Confirm current program interfaces, fees, support, and legal consequences immediately before approval.

## Current founder selection

The selected launch design is a direct MADGER/SOL Raydium CPMM liquidity pool scheduled conditionally for August 27, 2026 at 14:00 UTC. This replaces the stale LaunchLab reference: MADGER is already minted and is not using a bonding curve or graduation mechanism.

The selection remains blocked from execution until the compliant transaction path, exact liquidity budget, opening valuation/tolerance, LP policy, mint-authority revocation, allocation transfers, custody signers, and emergency owners are approved. Raydium's current interface requires a jurisdiction representation that the U.S.-citizen founder cannot truthfully make; no one may accept it on his behalf without a documented compliant path.

## Common opening mechanics

An initial pool deposits MADGER plus a quote asset (SOL for the selected design). In a constant-product pool, the deposit ratio establishes the marginal opening price: `SOL value deposited / MADGER deposited`; opening fully diluted valuation is that price times 1,000,000,000. The pool does not guarantee that price: fees, arbitrage, MEV, thin depth, and trades move execution price. Larger balanced capital generally reduces price impact; the required capital depends on approved valuation, expected order size, fee tier, and acceptable slippage. Reserve SOL for rent/network and priority fees, but determine every amount through approval.

Slippage is the difference between quoted and executed output. Users should set their own limits and verify routes; the project must not promise execution. Simulate creation, verify token decimals and vaults, and avoid announcing until the pool is finalized and independently readable.

## Viable method comparison

| Method | Capital/opening mechanics | LP ownership and policy | Advantages | Disadvantages and risks |
|---|---|---|---|---|
| Direct Raydium CPMM liquidity — **selected, not yet cleared** | Fund both assets; initial reserve ratio sets price. Capital must support approved depth and fees. | Pool LP tokens go to the approved liquidity custodian, then follow the approved retention/lock policy. | Familiar Solana venue; straightforward full-range liquidity; simple public explanation. | Impermanent loss, pool-creation/program/MEV risk, counterfeit pools, thin depth, jurisdiction restrictions, and no guarantee of aggregation or volume. |
| Raydium concentrated liquidity | Fund both sides within chosen ranges; initial price and ranges determine active depth. | NFT/position custody and range-management authority require strong controls; locking support may differ. | More capital-efficient near the opening price; configurable fees/ranges. | Active management, out-of-range one-sided inventory, more operational complexity, price-setting error, and position-custody risk. |
| Orca concentrated-liquidity pool | Similar paired capital, tick/range, fee-tier, and initial-price choices. | Position NFT remains governed by approved custodians; verify locker compatibility before promising a lock. | Alternative established AMM design and capital efficiency. | Same range/IL risks, venue-specific interfaces/programs, and no guaranteed route/listing/volume. |
| Meteora dynamic/concentrated products | Paired inventory and selected product parameters determine price/depth; some designs vary fees or manage bins. | Position custody and automation permissions must be documented and monitored. | Flexible liquidity/fee designs and potential launch tooling. | Greater parameter and smart-contract complexity, changing product availability, automation risk, and harder public explanation. |
| Permissionless launch/auction mechanism followed by AMM | Participants discover a price under mechanism rules; proceeds/inventory may migrate to a pool. Requirements vary materially. | Contract rules determine custody/migration; audit and founder/legal review are essential. | Can distribute price discovery rather than choosing only a reserve ratio. | Not the selected already-minted direct-pool path; bot/MEV, participation, migration, compliance, configuration, and platform-support risks. |
| OTC/market-maker arrangement plus public pool | Negotiated inventory/capital and spreads supplement the pool. | Requires contracts, inventory limits, reporting, counterparty controls, and transparent conflicts. | Potentially deeper two-sided liquidity and operational support. | Counterparty/default, opaque incentives, manipulation, jurisdictional, inventory, and reputational risk; unsuitable without qualified review. |

Creating more than one initial pool can fragment depth and confuse verification. Jupiter is primarily a router rather than a substitute for initial liquidity; route discovery is not guaranteed and should be verified after a supported pool exists.

## Fee-tier evidence

Raydium's current pool guidance presents 1% as the rough CPMM tier for long-tail or memecoin pairs and 0.25% for most volatile major pairs. The founder must approve the exact tier after reviewing expected volume, depth, routing, and user cost. Fee tier cannot be treated as a cosmetic choice.

## LP retention, locking, and burning

- **Retain under governed custody:** reversible and supports migration/rebalancing, but creates withdrawal/key/governance trust risk.
- **Time-lock:** constrains withdrawal for a disclosed period while potentially preserving later recovery; adds locker smart-contract, compatibility, admin, and unlock-date risk.
- **Raydium Burn & Earn:** permanently locks the CPMM LP position while a transferable Fee Key NFT retains fee-claim rights. The lock is irreversible and the Fee Key becomes a critical custody asset.
- **Burn:** sends LP ownership to an unrecoverable destination and may demonstrate permanence, but is irreversible; eliminates migration/recovery and can strand assets or fees.

The founder must approve the LP policy and exact disclosure. Independent technical and legal review must precede any irreversible lock, burn, authority change, or commitment.

## Decision evidence required

Obtain current official program documentation; program IDs and decoded instructions; simulations/rehearsal results; budget and fee reserve; opening valuation and tolerance; expected-trade slippage models; SOL quote-asset risks; custody/signers; LP policy; monitoring; incident plan; legal review; and independent reviewer sign-off. Stop if any input is unresolved.
