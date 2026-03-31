# Stake Frontend Approval Checklist

## Files to inspect first
- `game/src/ui/GameTable.svelte`
- `game/src/game/store.js`
- `game/src/game/engine.js`
- `docs/GAME_SPEC.md`
- `docs/STAKE_FRONTEND_READINESS.md`

## Typical failure modes
- controls enabled when action is illegal
- controls disabled even though engine now supports the action
- stale rules/help copy
- RTP wording overstating certainty
- side-bet copy mismatching payout logic
- session/replay/resume labels implying unsupported behavior
