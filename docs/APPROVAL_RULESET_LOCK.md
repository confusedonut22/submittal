# Sidebets Blackjack — Approval Ruleset Lock

This document freezes the current product/rules direction for Stake submission work.
It is the source of truth until replaced by a finalized math-backed rules sheet.

## Submission target

- Product: **Sidebets Blackjack**
- Category: real blackjack / table game
- Platform target: Stake Engine
- Base-game RTP hard ceiling: **98.0%**
- Working base-game target: slightly below 98.0% to preserve safety margin in final exported math

## Locked rules direction

### Core blackjack
- 6 decks
- Dealer **hits soft 17**
- Blackjack pays **7:5**
- Double allowed on hard 9, 10, or 11 (no DAS, no soft doubling)
- Insurance offered against dealer Ace
- No pseudo-blackjack / no forced autoplay product model
- Final game must support real player decisions

### Splits
- Splits are included
- Split hands may be hit multiple times
- Split aces receive one card only
- Split aces may not be resplit
- No resplitting of any pairs
- No double-after-split (DAS disabled)
- Blackjack pays 7:5 (1.4x) — this is the primary RTP lever that keeps base game at ~97.9%
- Double allowed on hard 9, 10, 11 (no DAS, no soft doubling)

### Surrender
- Late surrender is **not included by default** as an RTP-reduction lever because it increases player RTP
- It may still be added later for product reasons, but only intentionally and with explicit revalidation of the published RTP

### Side bets
- Perfect Pairs included
- 21+3 included
- Side-bet RTP is documented separately from base-game RTP
- Combined RTP depends on actual wager mix and must be described clearly in player-facing help/rules

## Implementation consequences

The codebase must converge on:
- a real split-capable round engine
- a deterministic replay/state schema for multi-hand blackjack
- a math/export pipeline that is stronger than the current draft simulation bundle
- submission docs whose rules exactly match the implemented frontend and math

## Current non-goals

These are not assumed to be locked in yet:
- resplit limit for non-aces
- whether double-after-split survives final math validation
- whether surrender is product-enabled
- exact published base-game RTP percentage (must be finalized by math work, but remain below 98.0%)
