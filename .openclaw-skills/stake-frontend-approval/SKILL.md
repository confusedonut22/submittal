---
name: stake-frontend-approval
description: "Align the Sidebets Blackjack frontend with approval-focused behavior and player-facing clarity. Use when working on: (1) action controls like hit/stand/double/split, (2) rules/help/RTP copy, (3) side-bet presentation, (4) state-driven enable/disable logic, (5) Stake session/bootstrap/resume surfaces, or (6) frontend readiness against approval-style checklists."
---

# Stake Frontend Approval

Use this skill for player-facing and runtime/frontend work in:
- `game/src/ui/GameTable.svelte`
- `game/src/game/store.js`
- `game/src/game/rules.js`
- `game/src/game/session*.js`
- `docs/GAME_SPEC.md`
- `docs/STAKE_FRONTEND_READINESS.md`

## Frontend goals

- action buttons reflect real engine legality
- rules/help text matches implemented behavior exactly
- RTP text stays consistent with current math status
- side-bet display is clear
- session/bootstrap surfaces do not mislead the player about unsupported features

## Approval-minded heuristics

- never leave stale copy such as "Split is not available" after enabling split logic
- prefer deriving button state from engine/store truth instead of duplicating rules in the UI
- if a feature is still draft-only, label it carefully rather than implying final Stake approval status
- keep wording precise when RTP is still estimate-backed

## Minimum UI checks

Verify:
- Split button enables only when legal
- Double button disables correctly for locked split-ace hands or insufficient balance
- result text still makes sense for multiple active hands
- rules modal matches the current ruleset
- session/resume/replay banners do not contradict known product constraints

## References

Read `references/checklist.md` for a short checklist.
