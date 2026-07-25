# Liquidity methods for an already-minted Solana token

This comparison informs a founder decision; it does **not** select a method, budget, quote asset, opening valuation, venue, lock provider, or transaction. Confirm current program interfaces, fees, support, and legal consequences immediately before approval.

## Common opening mechanics

An initial pool deposits MADGER plus a quote asset (often SOL or a stablecoin). In a constant-product pool, the deposit ratio establishes the marginal opening price: `quote deposited / MADGER deposited`; opening fully diluted valuation is that price times 1,000,000,000. Concentrated-liquidity designs also require a price range. The pool does not guarantee that price: fees, arbitrage, MEV, thin depth, range boundaries, and trades move execution price. Larger balanced capital generally reduces price impact; the required capital depends on approved valuation, expected order size, fee tier, range, and acceptable slippage. Reserve SOL for rent/network fees, but determine every amount through approval—none is supplied here.

Slippage is the difference between quoted and executed output. Users should set their own limits and verify routes; the project must not promise execution. Simulate creation, verify token decimals and vaults, and avoid announcing until the pool is finalized and independently readable.

## Viable method comparison

| Method | Capital/opening mechanics | LP ownership and policy | Advantages | Disadvantages and risks |
|---|---|---|---|---|
| Direct Raydium CPMM liquidity | Fund both assets; initial reserve ratio sets price. Capital must support approved depth and fees. | Pool position/LP tokens go to the approved liquidity custodian. They may be retained, time-locked with a vetted compatible locker, or irreversibly burned. | Familiar Solana venue; straightforward full-range liquidity; routing/indexing may follow organically. | Impermanent loss, pool-creation/program/MEV risk, counterfeit pools, thin depth, and no guarantee of aggregation or volume. Confirm current pool type and fees. |
| Raydium concentrated liquidity | Fund both sides within chosen ranges; initial price and ranges determine active depth. | NFT/position custody and range-management authority require strong controls; locking support may differ. | More capital-efficient near the opening price; configurable fees/ranges. | Active management, out-of-range one-sided inventory, more operational complexity, price-setting error, and position-custody risk. |
| Orca concentrated-liquidity pool | Similar paired capital, tick/range, fee-tier, and initial-price choices. | Position NFT remains governed by approved custodians; verify locker compatibility before promising a lock. | Alternative established AMM design and capital efficiency. | Same range/IL risks, venue-specific interfaces/programs, and no guaranteed route/listing/volume. |
| Meteora dynamic/concentrated products | Paired inventory and selected product parameters determine price/depth; some designs vary fees or manage bins. | Position custody and any automation permissions must be documented and monitored. | Flexible liquidity/fee designs and potential launch tooling. | Greater parameter and smart-contract complexity, changing product availability, automation risk, and harder public explanation. |
| Permissionless launch/auction mechanism followed by AMM | Participants discover a price under mechanism rules; proceeds/inventory may migrate to a pool. Requirements vary materially. | Contract rules determine custody/migration; audit and founder/legal review are essential. | Can distribute price discovery rather than choosing only a reserve ratio. | Not a simple “already-minted pool” path; bot/MEV, participation, migration, compliance, configuration, and platform-support risks. Never assume the existing mint is supported. |
| OTC/market-maker arrangement plus public pool | Negotiated inventory/capital and spreads supplement the pool. | Requires contracts, inventory limits, reporting, counterparty controls, and transparent conflicts. | Potentially deeper two-sided liquidity and operational support. | Counterparty/default, opaque incentives, manipulation, jurisdictional, inventory, and reputational risk; unsuitable without qualified review. |

Creating more than one initial pool can fragment depth and confuse verification. Jupiter is primarily a router rather than a substitute for initial liquidity; route discovery is not guaranteed and should be verified after a supported pool exists.

## LP retention, locking, and burning

- **Retain under governed custody:** reversible and supports migration/rebalancing, but creates withdrawal/key/governance trust risk.
- **Time-lock:** constrains withdrawal for a disclosed period while potentially preserving later recovery; adds locker smart-contract, compatibility, admin, and unlock-date risk. Verify on-chain, do not rely on a badge.
- **Burn:** sends LP ownership to an unrecoverable destination and may demonstrate permanence, but is irreversible; eliminates migration/recovery and can strand assets or fees. Concentrated positions may not support the same concept.

The founder must approve the LP policy and exact disclosure. Independent technical and legal review must precede any irreversible lock, burn, authority change, or commitment.

## Decision evidence required

Obtain current official program documentation; program IDs and decoded instructions; simulations/rehearsal results; budget and fee reserve; opening valuation and tolerance; expected-trade slippage models; chosen quote asset risks; custody/signers; LP policy; monitoring; incident plan; legal review; and an independent reviewer sign-off. Stop if any input is unresolved.
