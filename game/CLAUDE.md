# CLAUDE.md — sidebet-blackjack

AI assistant guide for the `sidebet-blackjack` codebase.

---

## Project Overview

A production-grade blackjack game client built with Svelte 5 + Vite. Integrates with the **Stake Engine RGS** (Remote Gaming Server) for real-money gaming: authentication, balance management, round tracking, and resumable sessions.

**Key features:**
- Main bet + two side bets (Perfect Pairs, 21+3)
- Autoplay with three strategy modes (Conservative, Optimal, High Stakes)
- Mobile-responsive canvas UI
- Synthesized audio via Web Audio API (no external audio files)
- Jurisdiction-configurable feature flags
- Round resume support for interrupted sessions

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Svelte 5 |
| Build tool | Vite 8 |
| Graphics | Pixi.js 8 |
| Font | `@fontsource/caveat` |
| Test runner | Node native (`node:test`) |
| Module format | ES modules (`"type": "module"`) |

---

## Directory Structure

```
src/
├── main.js                 # Entry point: parses query, bootstraps session, mounts app
├── App.svelte              # Root component
├── app.css                 # Global styles
├── ui/
│   └── GameTable.svelte    # Main game UI (~800 lines); handles all phases and rendering
├── lib/
│   └── Counter.svelte      # Reusable counter widget
├── assets/                 # Images (chips, logos, card art), fonts, asset map JSON
└── game/                   # Core game logic (14 modules — pure JS, no Svelte deps)
    ├── engine.js            # Card math: shoe, hand evaluation, side bet evaluation, basic strategy
    ├── rules.js             # Numeric constants: scales, suits, ranks, phase enum, speeds, chips
    ├── constants.js         # Re-exports + image asset mappings
    ├── store.js             # Svelte writable/derived stores for reactive state
    ├── betConfig.js         # Bet validation and config normalization
    ├── session.js           # URL query parsing and launch defaults
    ├── bootstrap.js         # Session bootstrap orchestration + RGS auth
    ├── rgsClient.js         # RGS HTTP API client
    ├── stakeRound.js        # Round normalization and event payload building
    ├── stakeRoundState.js   # Round state serialization for resume support
    ├── roundSettlement.js   # Hand settlement and payout calculation
    ├── sessionDisplay.js    # Currency and session display formatting
    ├── content.js           # Facts and bad-beat message arrays
    └── audio.js             # Synthesized sound effects

test/                        # Unit/integration tests (one file per game/ module)
```

---

## Development Commands

```bash
npm run dev        # Start Vite dev server (hot module reload)
npm run build      # Production build → dist/
npm run preview    # Serve production build locally
npm run test       # Run all tests (node --test)
```

Tests live in `test/` and are named `<module>.test.js`. Run a single file:

```bash
node --test test/roundSettlement.test.js
```

---

## Architectural Conventions

### 1. Separation of concerns

- **`src/game/`** — pure JS modules, no Svelte imports allowed. Business logic lives here and is independently testable.
- **`src/ui/`** — Svelte components that import from `src/game/`. No game logic should leak into components.
- **`store.js`** is the bridge: reactive Svelte stores that wrap game state.

### 2. Money representation

All monetary values are stored as **integers in micro-units**:

```
MONEY_SCALE = 1_000_000   →  1,000,000 units = $1.00
$1000 = 1_000_000_000 units
```

Never use floating-point arithmetic for money. All calculations use integer math. `sessionDisplay.js` handles formatting for display.

### 3. Phase state machine

The game progresses through these phases (defined in `rules.js`):

```
INTRO → BET → DEAL → PLAY → DEALER → RESULT
                                   ↘ INS (insurance offered)
```

`phase` is a Svelte writable store in `store.js`. UI rendering in `GameTable.svelte` branches on the current phase.

### 4. RGS integration modes

The client supports three operating modes based on URL query params:

| Mode | Description |
|------|-------------|
| **Normal** | Full RGS session (sessionID required) |
| **Local** | No RGS — runs standalone for development/testing |
| **Replay** | Fetches a prior round event for review |

Bootstrap logic lives in `bootstrap.js`; HTTP calls in `rgsClient.js`.

### 5. Bet configuration

Bets can be configured as either:
- **Discrete levels:** an explicit array of allowed amounts
- **Range:** `{ min, max, step }` object

Both main bets and side bets are normalized through `betConfig.js`. Never hardcode bet amounts; always use the normalized config.

### 6. Jurisdiction flags

RGS responses can include flags that disable features:
- Autoplay, turbo mode, fullscreen, session timer display, etc.

These are parsed in `bootstrap.js` and stored in the session config. UI checks these flags before rendering feature controls.

---

## Testing Conventions

- Framework: `node:test` (Node native — no Jest, no Vitest)
- Assertions: `node:assert`
- One test file per game module
- Tests should be runnable with `node --test test/<file>.test.js`
- Do not test Svelte components directly; test the game logic modules they depend on

Example test structure:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { myFunction } from '../src/game/myModule.js';

describe('myFunction', () => {
  it('does the expected thing', () => {
    assert.strictEqual(myFunction(input), expected);
  });
});
```

---

## Key Modules Reference

### `engine.js`
- `makeShoe()` — generates a shuffled 6-deck shoe
- `drawCard(shoe)` — pops and returns next card
- `handValue(cards)` — returns best non-bust hand total
- `isSoft(cards)` — true if hand has an ace counted as 11
- `isBlackjack(cards)` — natural 21 on first two cards
- `evaluatePerfectPairs(card1, card2)` — returns PP payout multiplier
- `evaluate21Plus3(playerCards, dealerUpCard)` — returns 21+3 payout multiplier
- `basicStrategyAction(hand, dealerUp, canDouble, canSplit)` — returns `'hit'|'stand'|'double'|'split'`

### `roundSettlement.js`
- `settleImmediateHands(hands, dealerHand, rgsRound)` — resolves player hands
- `settleDealerHands(dealerHand, hands)` — calculates dealer outcomes
- `getInsuranceAmount(totalMainBet)` — returns insurance bet (half main bet)

### `sessionDisplay.js`
- `formatCurrencyAmount(units, currencyCode)` — e.g. `1_000_000` → `"$1.00"`
- `formatSignedMoney(units, currencyCode)` — prefixes `+`/`-`
- `formatSessionDuration(startedAt)` — e.g. `"12:34"`

### `stakeRoundState.js`
- `buildRoundStateSnapshot(gameState)` — serializes in-flight round
- `canHydrateRoundState(snapshot)` — validates schema version before resume

---

## Side Bet Payouts

| Bet | Hand | Multiplier |
|-----|------|-----------|
| Perfect Pairs | Mixed pair | 6x |
| Perfect Pairs | Colored pair | 12x |
| Perfect Pairs | Perfect pair | 25x |
| 21+3 | Flush | 5x |
| 21+3 | Straight | 10x |
| 21+3 | Three of a kind | 30x |
| 21+3 | Straight flush | 40x |
| 21+3 | Suited three of a kind | 100x |

---

## Environment Variables

Vite environment variables (prefix `VITE_`) can provide dev defaults:

| Variable | Purpose |
|----------|---------|
| `VITE_RGS_URL` | Default RGS base URL |
| `VITE_SESSION_ID` | Default session ID for local dev |

Parsed in `session.js` via `readLaunchDefaults()`.

---

## Common Pitfalls

1. **Do not use floating-point math for money.** Always work in integer micro-units and only convert to display strings at the last step via `sessionDisplay.js`.

2. **Do not import Svelte stores in game/ modules.** If a game module needs to emit state changes, export a plain value and let the caller update the store.

3. **Do not hardcode bet amounts or payout multipliers** outside of `rules.js`. All payout logic should reference constants there.

4. **Resume compatibility:** `stakeRoundState.js` includes `ROUND_STATE_SCHEMA_VERSION`. If you change the shape of the round snapshot, bump this version and update `canHydrateRoundState()` accordingly.

5. **RGS URL normalization:** Always pass URLs through `normalizeRgsUrl()` in `session.js` — it handles relative paths, localhost rewrites, and https normalization.

6. **Tests use Node's built-in runner** — do not install Jest or Vitest. Add new tests as `.test.js` files in `test/` using `node:test` and `node:assert`.

7. **Custom face card rendering:** Use `background-image` CSS on the card div — do NOT use an inner `<img>` tag. Svelte CSS scoping makes absolute-positioned child images unreliable and can cause oversizing and checker backgrounds.

```svelte
<!-- CORRECT -->
<div class="card card-face" class:small={multi}
     style="background-image:url({customFaceFor(card)});background-size:cover;background-position:center;background-repeat:no-repeat;">
</div>

<!-- WRONG — causes oversizing and transparent checker bg -->
<div class="card card-face card-custom" ...>
  <img src={...} style="position:absolute;..." />
</div>
```

---

## Deployment

- **GitHub**: `confusedonut22/sidebet-blackjack`
- **Vercel**: auto-deploys on merge to `main` (project ID: `prj_cBrlpvRsG0H6Iy79hU2sXxDhiq4W`)
- Workflow: feature branch → PR → merge to `main` → Vercel deploys automatically
- Run `npm run build` to catch build errors before pushing
