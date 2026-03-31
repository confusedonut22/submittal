# Current Context — Sidebets Blackjack

## Why this skill exists

This repo is trying to make a real blackjack game approval-ready for Stake Engine while staying under a base RTP ceiling of 98.0%.

## Locked assumptions

- Product name: Sidebets Blackjack
- Real blackjack with player decisions
- Perfect Pairs and 21+3 included
- Splits included
- Split hands may be hit multiple times
- Split aces get one card only
- No resplit aces
- Dealer hits soft 17
- Blackjack pays 3:2
- Base-game RTP must remain below 98.0%

## Known pitfalls

- Generic Stake docs strongly emphasize stateless/static-file expectations.
- Generic docs also say replay is mandatory for new games, but there is conflicting anecdotal guidance; do not rely on the anecdote as a hard override.
- Surrender increases RTP; do not use it as a lowering mechanism.
- Early project state included disabled split UI and single-hand-oriented engine/export logic.

## Immediate engineering goals

1. make splits real in frontend/runtime state
2. keep settlement correct for split hands
3. align Python math engine with frontend rules
4. tighten export/submission artifacts after the core game behavior is correct

## User communication preference

When asked for visible proof, provide:
- current file being changed
- last command run
- last commit / test result

Also send a short "still working" update periodically if requested.
