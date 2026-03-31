---
name: split-blackjack-engine
description: "Implement and verify split-capable real blackjack logic in this repo. Use when editing engine/store/math behavior for: (1) split eligibility, (2) split hand creation and lineage, (3) split aces restrictions, (4) double/hit/stand action legality, (5) multi-hand progression, or (6) settlement correctness including preventing split 21 from paying as a natural blackjack."
---

# Split Blackjack Engine

Use this skill when changing blackjack game logic in either:
- `game/src/game/engine.js`
- `game/src/game/store.js`
- `game/src/game/roundSettlement.js`
- `math/engine.py`

## Locked behavior targets

Implement toward these assumptions unless repo docs explicitly change them:
- splits are included
- split hands may be hit multiple times
- split aces receive one card only
- no resplit aces
- dealer hits soft 17
- blackjack pays 3:2 only for true natural blackjacks

## Engine invariants

Preserve these invariants:
- a split-created 21 is **not** a natural blackjack
- split action increases the main wager by exactly one additional hand bet
- side bets are evaluated off the initial deal and should not be duplicated by split creation unless the product explicitly says so
- split-ace hands lock correctly after the single extra card
- turn progression moves hand by hand and only runs dealer resolution once player actions are complete

## Preferred work order

1. update hand state shape
2. update action legality helpers
3. update split creation logic
4. update settlement logic
5. update UI/store to consume the new state
6. add/adjust tests

## Minimum checks after edits

Verify:
- pair hand can split when intended
- non-pair hand cannot split
- split creates two playable hands
- total wager increases correctly
- split 21 resolves as ordinary 21, not blackjack
- split aces stop after one card
- dealer settlement still works after multi-hand play

## References

Read `references/checklist.md` when making changes.
