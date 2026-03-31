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
- Blackjack pays **3:2**
- Double allowed on any initial two-card hand
- Insurance offered against dealer Ace
- No pseudo-blackjack / no forced autoplay product model
- Final game must support real player decisions

### Splits
- Splits are included
- Split hands may be hit multiple times
- Split aces receive one card only
- Split aces may not be resplit
- Resplitting non-aces is allowed only if final RTP/math validation keeps the base game below 98.0%
- Double-after-split is treated as a configurable toggle during implementation and will remain only if math validation keeps the base game below 98.0%

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
