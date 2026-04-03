# Blackjack RGS Contract Draft

This document freezes the current repo-local contract for integrating the
blackjack frontend in [game](game)
with a Stake-style RGS flow.

This is not a final Stake-approved contract. It exists to separate:

- what the frontend can already do
- what the backend or RGS must eventually own
- what remains an open blackjack-specific question

## confirmed frontend assumptions

### authenticate

The frontend expects `Authenticate` to return:

- `balance`
- `config`
- `round`
- optional jurisdiction data

The frontend now normalizes:

- `balance.amount`
- `config.minBet`
- `config.maxBet`
- `config.stepBet`
- `config.defaultBetLevel`
- `config.betLevels`
- `config.sideBets`
- jurisdiction flags such as `disabledAutoplay` and `displayRTP`
- `round.betID`
- `round.active`
- `round.mode`
- `round.event`
- `round.state`

### play

The frontend currently sends one `Play` request at the start of a blackjack hand.

Current draft request meaning:

- `amount` = total round debit at hand start
  - main bet
  - perfect pairs side bet
  - 21+3 side bet
- `mode` = `BASE`

The mock RGS now validates that the declared `amount` exactly matches the sum of
all submitted hand bets and side bets. The backend no longer trusts the frontend
to declare an unrelated total.

This keeps the current prototype aligned with a single-round interpretation of a blackjack hand.

## event contract

The frontend now emits sequenced JSON strings through `Event`.

Current envelope:

- `schemaVersion`
- `betID`
- `mode`
- `sequence`
- `event`
- `state`

### current event types

- `initialDeal`
- `insuranceDecision`
- `sideBetsResolved`
- `initialResolution`
- `playerAction`
- `dealerFinal`
- `roundSettlement`

Current enforced action-driving event types in the mock RGS:

- `insuranceDecision`
- `playerAction`

The other event names above still exist as useful replay and audit markers in the
frontend flow, but the authoritative backend currently validates and executes only
the action-driving event types.

### current `state` snapshot

The current draft resume snapshot includes:

- `schemaVersion`
- `phase`
- `activeHand`
- `allowedActions`
- `dealerHand`
- `shoe`
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

## end-round timing

Based on the official Web SDK FAQ, table-style games should keep the round active
until the hand is meaningfully complete if interrupted play needs to be resumable.

Current repo-local policy:

- call `Play` once at the beginning of the hand
- keep the round active through:
  - initial deal
  - side-bet resolution
  - insurance prompt and decision
  - all player actions
  - dealer draw
  - settlement
- call `EndRound` only after final round settlement is known

This is the safest current interpretation for blackjack because a hand can contain
multiple decisions and branching states.

## side bets and insurance

### current frontend behavior

- side bets are included in the initial total debit used for `Play`
- side bets can now be validated against authenticated config instead of always behaving like free-form local chip math
- side-bet resolution is emitted through `sideBetsResolved`
- insurance is offered after the initial deal when the dealer up-card is an Ace
- the insurance decision is emitted through `insuranceDecision`

### still unresolved

The official public docs do not clearly define whether blackjack side bets and
insurance should be represented:

- only as part of the initial `Play` amount
- as distinct event-level accounting inside `round.state`
- or as separate backend-tracked bet components

Until backend authority exists, treat this as an open integration question.

## resume strategy

### current state

- the frontend can now emit a draft resume snapshot through `Event`
- the frontend can detect an active round from `Authenticate`
- the frontend can now hydrate a live game when returned `round.state` matches this draft snapshot shape

### required backend handoff

To fully support blackjack resume, the RGS or backing service must return a
`round.state` shape that can restore:

- current phase
- dealer hand visibility
- current player hands
- pending insurance prompt state
- active hand index
- all resolved side bets
- current bankroll-visible round results

## true external blockers

These are no longer just frontend gaps:

1. Server-authoritative round outcome ownership
2. Real resumed-hand hydration from returned `round.state`
3. Final Stake-confirmed handling for blackjack replay and side-bet representation
4. A backend or RGS implementation that persists event/state updates during an active hand
