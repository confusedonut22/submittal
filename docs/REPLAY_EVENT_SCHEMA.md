# Replay Event Schema

This document freezes the draft replay/event shape currently emitted by
[/Users/gerryturnbow/degen-blackjack/stake_export.py](/Users/gerryturnbow/degen-blackjack/stake_export.py).

## scope

This is a repo-local schema for preparation work. It is not a final Stake RGS contract.

## round-level fields

- `id`
- `events`
- `payoutMultiplier`

## frontend event envelope

The frontend now emits each in-progress `Event` call as a JSON string with:

- `schemaVersion`
- `betID`
- `mode`
- `sequence`
- `event`
- `state`

This is still repo-local scaffolding, but it now aligns with the official Stake `round`
shape more closely by keying events to the active `betID` and attaching a draft
resume snapshot that can later map into `round.state`.

## state snapshot fields

The draft `state` snapshot currently includes:

- `schemaVersion`
- `phase`
- `activeHand`
- `allowedActions`
- `dealerHand`
- `hands[]`
  - `bet`
  - `sideBets`
  - `cards`
  - `result`
  - `payout`
  - `done`
  - `doubled`
  - `sideBetResults`
- `pendingInsurance`
- `message`
- `lossStreak`

## event types

### `initialDeal`
- `dealerUp`
- `dealerHole`
- `playerCards`
- `sideBets`
- `insuranceOffered`

### `sideBetsResolved`
- `hands[]`
  - `handIndex`
  - `results[]`
    - `betType`
    - `won`
    - `name`
    - `multiplier`
    - `payout`
- `totalPayout`

### `insuranceDecision`
- `accepted`
- `amount`

### `initialResolution`
- `dealerBlackjack`
- `insuranceTaken`
- `insuranceAmount`
- `immediatePayout`
- `hands[]`
  - `handIndex`
  - `result`
  - `payout`
  - `done`

### `playerAction`
- `action`
- optional `card`
- optional `value`

### `dealerFinal`
- `cards`
- `value`

### `roundSettlement`
- `handResult`
- `handPayout`
- `totalWagered`
- `totalReturned`
- `insuranceTaken`

## known gaps

- split-capable replay is a required implementation target and must add hand identifiers, split lineage, active-hand sequencing, and per-hand legal actions
- replay fetching now works against the repo-local mock RGS, but not yet against a real Stake-backed replay source
- authenticated round resume now works when `Authenticate` returns a hydratable draft `round.state`, but the final backend-owned contract is still unconfirmed
- frontend `Event` calls now send sequenced JSON strings, but the final Stake blackjack schema is still unconfirmed
- event sequencing and `state` snapshots are now backed by the repo-local mock RGS, but not yet by a real Stake-owned production service
- the locked ruleset direction is now Vegas-style blackjack with splits, multi-hit split hands, split-ace restrictions, insurance support, and a base-game RTP ceiling below 98.0%
