# MADGER tokenomics and on-chain controls

Status: **trading live on Solana**. Verified September 16, 2026. Dynamic balances must be rechecked on-chain before use.

## Verified token facts

| Field | Value |
|---|---|
| Network | Solana |
| Name / symbol | MADGER / MADGER |
| Official mint | `BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv` |
| Current on-chain supply | 999,999,994.992751 MADGER |
| Decimals | 6 |
| Token program | Classic SPL Token |
| Mint authority | Revoked |
| Freeze authority | Revoked |
| Transfer tax | 0%; no Token-2022 transfer-fee extension |
| Official Raydium CPMM pool | `FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h` |

## Circulating-supply calculation

Only balances held in verified program locks are excluded:

| Lock | Escrow | Locked MADGER | On-chain terms |
|---|---|---:|---|
| Strategic Treasury Reserve | `5LVpo5QrNJPuasud75CuF3gRtipFStkR2seyWMgg5E8V` | 499,999,999.999968 | Jupiter Lock; no cliff release before 2027-09-08 21:30 UTC; 36 monthly periods; cancellation and recipient-update modes disabled |
| Core Treasury Reserve | `hXgWwvwmaYkCyehaea1AzcbD156LmR2mQtYU18eTvrL` | 160,000,000 | Jupiter Lock; 32,000,000.000020 cliff on 2027-03-12 08:30 UTC; 36 monthly periods; cancellation and recipient-update modes disabled |
| **Total provably locked** | | **659,999,999.999968** | **66.00% of current supply** |

Maximum circulating supply is:

`999,999,994.992751 − 659,999,999.999968 = 339,999,994.992783 MADGER`

“Maximum circulating” is deliberate: unlocked balances may be held or inactive. No ordinary project wallet is excluded from this calculation.

## Liquidity-provider custody

The LP mint is `2VXW1Q4oEzEMPfMHHL2bjDE3BtKiDN8mT9jvAnem14CF`, with total supply of 422.039094066 LP. Four noncancelable and nontransferable Streamflow escrows hold 419.939397081 LP, or 99.50% of supply. Approximately 0.50% is held by Streamflow's protocol treasury; creator-held LP is one base unit (0.000000001 LP).

The public [supply and liquidity transparency record](https://madgercoin.com/transparency.html) contains every escrow address, exact balance, unlock time, and creation transaction.

## Transparency standard

- Publish only finalized, independently verified facts.
- Exclude supply from circulation only when a program lock and balance are public.
- Link token-lock and LP-custody claims to creation transactions, not screenshots or badges.
- Do not describe ordinary wallet labels as protocol-enforced restrictions.
- Do not promise price, liquidity, exchange listings, returns, or appreciation.
- Correct inconsistencies across the website, explorers, listings, and social channels promptly.

## Change control

Any change to supply methodology, authority policy, liquidity policy, or controlled-wallet disclosures requires a versioned decision record with a UTC timestamp and supporting on-chain evidence. Signing material never belongs in this repository.
