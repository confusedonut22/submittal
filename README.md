# Sidebets Blackjack — Stake Engine Submission

**Provider:** Chad Labs  
**Game:** Degen Blackjack (Sidebets Blackjack)  
**Platform:** Stake Engine RGS  
**Category:** Table Game — Blackjack

## Game Description
A premium 6-deck blackjack game with Perfect Pairs and 21+3 side bets. Features real player decisions including Hit, Stand, Double, and Split with authentic casino rules.

## Key Rules
- 6-deck shoe, reshuffles at 52 cards remaining
- Dealer hits soft 17 (H17)
- Blackjack pays 3:2
- Splitting allowed on same-rank pairs
- Split aces receive one card only, no resplit
- No double after split (DAS)
- Insurance offered against dealer Ace (pays 2:1)

## RTP
| Bet Type | Theoretical RTP |
|----------|----------------|
| Base Game | ~97.4% |
| Perfect Pairs | 86.50% |
| 21+3 | 85.70% |

## Live Build
- Desktop reference: https://sidebet-blackjack-b6rqo9vm9-confusedonut22s-projects.vercel.app/

## Tech Stack
- Frontend: Svelte + Vite (PixieJS planned for production)
- Math Engine: Python
- Assets: All bundled locally (no external resource loading)

## Repository Structure
```
├── game/               # Svelte/Vite frontend
├── math/               # Python math engine
├── docs/               # Specification and approval docs
├── tests/              # Python test suite
├── source-pdfs/        # Stake Engine reference documentation
├── assets/             # Chip images, logos
├── GAME_SPEC.md        # Full game specification
├── APPROVAL_TASK_LIST.md  # Approval readiness tracker
└── SUBMISSION_TASKS.md # Development task board
```

## Bet Replay
Supports the official Stake Engine Bet Replay format via `GET /bet/replay/{game}/{version}/{mode}/{event}`.

## Running Locally
```bash
# Frontend
cd game && npm install && npm run dev

# Mock RGS (optional)
python3 mock_rgs_server.py

# Math tests
python3 -m pytest tests/ -v
```
