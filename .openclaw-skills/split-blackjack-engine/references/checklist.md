# Split Blackjack Engine Checklist

## Files to inspect first
- `game/src/game/engine.js`
- `game/src/game/store.js`
- `game/src/game/roundSettlement.js`
- `math/engine.py`

## Hand-state fields that are often needed
- hand id
- parent hand id / split root id
- split depth
- is split hand
- from split aces
- split-ace lock flag
- doubled / stood / busted / done
- countsAsBlackjack

## Typical failure modes
- disabled split button in UI while backend allows it
- split 21 paid as blackjack
- split aces incorrectly hittable
- total wager not increased on split
- active hand index becomes wrong after inserting new hands
- docs/rules copy still claims split is unavailable
