# Degen Blackjack — Game Specification
## Chad Labs | Stake Engine RGS Integration Document

---

## 1. Game Overview

| Field | Value |
|-------|-------|
| Game Name | Degen Blackjack |
| Provider | Chad Labs |
| Type | Table Game — Blackjack |
| Platform | Stake Engine RGS |
| Frontend Stack | PixieJS + Svelte (production) |
| Math Engine | Python (Stake Engine SDK) |
| Prototype | React JSX (reference implementation) |

---

## 2. Game Rules

- Standard blackjack with 6-deck shoe
- Dealer stands on all 17s (hard and soft)
- Reshuffles when fewer than 52 cards remain in shoe
- No splitting (future feature)
- Double down permitted on any initial 2-card hand
- Multi-hand play: up to 4 simultaneous hands (desktop), 2 on mobile
- Play order: right to left across multiple hands

---

## 3. Payouts

### 3.1 Base Game

| Outcome | Payout | Description |
|---------|--------|-------------|
| Win | 1:1 | Player beats dealer |
| Blackjack | 3:2 | Natural 21 on first 2 cards |
| Push | Bet returned | Equal hand values |
| Insurance | 2:1 | Dealer has blackjack (offered when dealer shows Ace) |

### 3.2 Perfect Pairs Side Bet

| Hand | Payout |
|------|--------|
| Perfect Pair (same rank, same suit) | 25:1 |
| Coloured Pair (same rank, same color) | 12:1 |
| Mixed Pair (same rank, different color) | 6:1 |

### 3.3 21+3 Side Bet

| Hand | Payout |
|------|--------|
| Suited Trips | 100:1 |
| Straight Flush | 40:1 |
| Three of a Kind | 30:1 |
| Straight | 10:1 |
| Flush | 5:1 |

Note: 21+3 evaluates player's first 2 cards + dealer's up card.

---

## 4. Return to Player (RTP)

| Bet Type | Theoretical RTP |
|----------|----------------|
| Blackjack (base game) | 99.29%* |
| Perfect Pairs | 95.90% |
| 21+3 | 96.30% |

*Based on the first hand in the shoe using basic strategy.

"A player's skill and/or strategy will have an impact on their chances of winning."

---

## 5. Betting

### 5.1 Chip Denominations
- $0.50
- $1.00
- $5.00
- $25.00
- $100.00

### 5.2 Bet Mechanics
- Cumulative chip stacking (tap chip to add to bet)
- Each hand has independent bet amount
- Side bet cost: fixed at $0.10 per side bet per hand
- Bets persist between rounds (auto-carried forward)
- Insurance bet: half of main bet

### 5.3 Money Format
- Integers multiplied by 1,000,000
- Example: 1,000,000 = $1.00
- Starting balance: 100,000,000 ($100.00)

---

## 6. Game Flow

### 6.1 Phase State Machine

```
INTRO → BET → DEAL → PLAY → DEALER → RESULT → BET (loop)
                              ↕
                          INS_PROMPT
```

### 6.2 Phase Details

1. **INTRO**: Chad Labs splash screen (3 seconds), displayed once per session
2. **BET**: Player places chips, toggles side bets, manages hands. Can add/remove hands.
3. **DEAL**: Cards dealt to all hands + dealer. Sound effect plays.
4. **INS_PROMPT**: If dealer shows Ace, insurance prompt appears. Auto-declined in auto-play.
5. **PLAY**: Player actions (Hit/Stand/Double) on each hand, right to left. Active hand highlighted.
6. **DEALER**: Dealer draws to 17+. Card sound on each draw.
7. **RESULT**: Results displayed. Bad beat messages on qualifying losses. Payouts credited.

### 6.3 Immediate Resolutions (after deal, before play)
- Player blackjack + dealer blackjack → Push
- Player blackjack (no dealer BJ) → Blackjack payout, hand done
- Dealer blackjack (no player BJ) → Lose, hand done
- Side bets evaluated immediately after deal

---

## 7. Side Bet Evaluation

### 7.1 Perfect Pairs
Evaluated using player's first 2 cards only.
- Same rank + same suit → Perfect Pair (25:1)
- Same rank + same color (different suit) → Coloured Pair (12:1)
- Same rank + different color → Mixed Pair (6:1)

### 7.2 21+3
Evaluated using player's first 2 cards + dealer's up card.
- All same rank + all same suit → Suited Trips (100:1)
- Sequential ranks + all same suit → Straight Flush (40:1)
- All same rank → Three of a Kind (30:1)
- Sequential ranks → Straight (10:1)
- All same suit → Flush (5:1)

Rank order for straights: A,2,3,4,5,6,7,8,9,10,J,Q,K (Ace is low only)

---

## 8. Auto-Play

| Speed | Deal Delay | Draw Delay | Result Delay | Between Rounds |
|-------|-----------|------------|-------------|----------------|
| 1x | 400ms | 450ms | 700ms | 1000ms |
| 2x | 180ms | 200ms | 350ms | 500ms |
| 5x | 50ms | 60ms | 120ms | 250ms |
| Max | 0ms | 0ms | 20ms | 80ms |

- Strategy: Hit below 17, Stand on 17+ (basic strategy simplified)
- Insurance: always declined
- Side bet selections: preserved
- Max rounds: configurable (default 50, max 1000)

---

## 9. Special Features

### 9.1 Random Facts
- 130+ facts displayed during BET phase
- Categories: animals, science, history, human body, space
- New random fact each round
- Engagement mechanic to reduce perceived wait time

### 9.2 Bad Beat Messages
Sarcastic messages that replace normal result text on qualifying losses:

| Trigger | Examples |
|---------|----------|
| Player 20, dealer 21 | "RIGGED", "House always wins" |
| Player 19+, dealer wins | "Close but no cigar", "Pain." |
| Bust at 22 | "One too many", "Should have stood" |
| Double down bust | "Full send into a wall" |
| 5+ loss streak | "The table hates you", "Maybe try checkers" |
| Random 15% on any loss | "Tough break", "It happens" |

### 9.3 Audio
Synthesized via Web Audio API (no external files):
- Card snap: 80ms filtered noise burst on hit/double/dealer draw
- Deal swoosh: 150ms lowpass noise on deal

---

## 10. Visual Identity

### 10.1 Branding
- Provider: Chad Labs
- Logo: Displayed on card backs and intro screen
- No title bar in game (clean felt surface)

### 10.2 Colors
| Element | Hex |
|---------|-----|
| Background | #071a0e |
| Felt (center) | #0c2616 |
| Felt (edge) | #153d24 |
| Surface | #172e20 |
| Primary text (cream) | #f2e8d0 |
| Accent (gold) | #e8d48b |
| Win | #4caf50 |
| Lose | #ef5350 |
| Gold accent | #d4a840 |

### 10.3 Typography
- Font: Caveat (Google Fonts) — handwriting cursive
- ALL text uses same font family and cream color
- No emojis anywhere in the game

### 10.4 Cards
- White face with standard red/black suit symbols
- Card back: dark green gradient with Chad Labs logo centered
- Full size: 64x90px | Multi-hand: 50x70px

---

## 11. Assets Required for Production

| Asset | Format | Size | Notes |
|-------|--------|------|-------|
| 50c chip | PNG (transparent) | 256px | Black/white casino chip |
| $1 chip | PNG (transparent) | 256px | Red/white casino chip |
| $5 chip | PNG (transparent) | 256px | Blue/white casino chip |
| $25 chip | PNG (transparent) | 256px | Black/white/green casino chip |
| $100 chip | PNG (transparent) | 256px | Gold/white casino chip |
| Chad Labs logo | PNG (transparent) | 512px | For card backs + intro |
| Card sprites | Sprite sheet | TBD | Standard 52-card deck |

---

## 12. Integration Notes

### 12.1 Stake Engine API Endpoints
- `wallet/authenticate` — Session init
- `wallet/balance` — Check balance
- `play/bet` — Place bet, receive outcome
- `play/end-round` — Finalize round
- Server-authoritative RNG (not client-side)

### 12.2 Production Porting Requirements
- Frontend: Port React JSX to PixieJS (WebGL canvas) + Svelte
- Math: Port Python engine to Stake Engine's book-based system
- Assets: Upload to Stake Engine CDN (not Google Fonts)
- Font: Bundle Caveat as local asset
- Estimated effort: 2-3 weeks frontend, 1-2 weeks math

### 12.3 Regulatory
- All payouts match industry standard
- RTP figures verified via simulation (1M+ rounds)
- Malfunction clause: "Any malfunction voids the game round and all eventual payouts for the round."

---

## 13. File Manifest

```
stake-export/
├── math/
│   ├── engine.py          # Complete blackjack math engine
│   └── simulate.py        # RTP verification simulator
├── frontend/
│   └── degen-blackjack-v17.jsx  # React prototype (reference)
├── assets/
│   ├── chip_50c.png       # Chip images (originals from John)
│   ├── chip_1.png
│   ├── chip_5.png
│   ├── chip_25.png
│   ├── chip_100.png
│   └── chad_labs_logo.png
└── docs/
    └── GAME_SPEC.md        # This document
```
