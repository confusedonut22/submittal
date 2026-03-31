# Stake Math Bundle Checklist

## Files to inspect first
- `math/engine.py`
- `math/simulate.py`
- `stake_export.py`
- `exact_sidebet_math.py`
- `docs/GAME_SPEC.md`
- `docs/APPROVAL_RULESET_LOCK.md`

## Typical failure modes
- base RTP drifting above 98.0%
- docs still quoting old RTP after rules changed
- sampled scaffolds being described as final math
- side-bet payout convention mismatch (profit-only vs returning stake)
- split behavior in frontend not matching math assumptions

## Communication rule
Always say whether a number is:
- exact
- simulation-backed estimate
- draft export value
