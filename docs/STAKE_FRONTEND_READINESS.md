# Stake Frontend Readiness

This document tracks the current frontend submission blockers for
[/Users/gerryturnbow/degen-blackjack/game](/Users/gerryturnbow/degen-blackjack/game).

## confirmed

- The frontend builds to static files with Vite/Svelte.
- The app now parses Stake-style launch params:
  - `sessionID`
  - `lang`
  - `device`
  - `rgs_url`
  - `replay`
  - `game`
  - `version`
  - `mode`
  - `event`
- The frontend now uses `sessionID` and `rgs_url` for an `Authenticate` bootstrap scaffold.
- The frontend can also refresh the authenticated balance through the official `wallet/balance` path when the window regains focus.
- Authenticated balance and bet-config values can now seed the prototype stores.
- Authenticated currency can now drive balance and wager display instead of assuming USD-only output.
- Main bet selection can now respect authenticated bet levels when config provides them.
- Side-bet selection can now also respect authenticated side-bet config when provided.
- The frontend now emits Stake-style `Play`, `Event`, and `EndRound` client calls during round flow.
- Frontend round handling now normalizes the official Stake `round` shape around:
  - `betID`
  - `active`
  - `mode`
  - `event`
  - `state`
- Frontend `Event` payloads are now emitted as sequenced JSON strings keyed to the active `betID`.
- Frontend `Event` payloads now also attach a draft blackjack state snapshot so interrupted hands have a repo-local resume shape to build on.
- Frontend `EndRound` now aligns more closely with the official client shape by closing the round without inventing extra request payload fields.
- Jurisdiction flags from authenticate are now normalized in the frontend, with:
  - autoplay hidden/disabled when `disabledAutoplay` is true
  - RTP disclosure hidden when `displayRTP` is false
  - session timer shown when `displaySessionTimer` is true
  - net position shown when `displayNetPosition` is true
- If authenticate returns an active round with a hydratable `round.state`, the frontend can now restore that hand locally instead of always blocking resume.
- Replay bootstrap can now fetch a completed round from the mock RGS and hydrate the replay state locally.
- Local launch can now fall back to Vite env defaults for `sessionID` and `rgs_url`, while still allowing Stake-style query params to override them.
- The static build now uses relative asset paths, which is safer for CDN subpath hosting instead of assuming a domain-root `/assets` path.

## confirmed blockers

- The mock RGS can now own round creation, actions, replay fetch, and persisted active-round state, but it is still a local scaffold rather than a real Stake-integrated backend.
- Resume only works when the returned `round.state` matches the current repo-local draft snapshot shape.
- Replay mode can now hydrate completed mock-RGS rounds, but it is still not a final reviewer-grade replay implementation.
- The app can hydrate only its own current draft snapshot shape, not a finalized backend contract.

## open question

- For blackjack, replay likely needs the full hand decision sequence:
  - initial deal
  - side-bet resolution
  - insurance choice
  - hit/stand/double decisions
  - dealer draw sequence
  - final settlement
- A whole blackjack hand sequence is likely the correct replay unit, but the public docs remain slot-heavy.

## next repo-safe steps

1. Replace the local mock RGS with a real service boundary that owns wallet/session authority beyond local JSON scaffolding.
2. Freeze the final backend-owned blackjack round-resume strategy for active rounds returned by authenticate, including the exact `round.state` contract.
3. Decide how side bets and insurance map into authenticated Stake config and round lifecycle.
4. Treat replay as a blackjack-specific open question until Stake confirms the required behavior.

See also:

- [/Users/gerryturnbow/degen-blackjack/docs/BLACKJACK_RGS_CONTRACT.md](/Users/gerryturnbow/degen-blackjack/docs/BLACKJACK_RGS_CONTRACT.md)
- [/Users/gerryturnbow/degen-blackjack/docs/MOCK_RGS_SERVICE.md](/Users/gerryturnbow/degen-blackjack/docs/MOCK_RGS_SERVICE.md)
