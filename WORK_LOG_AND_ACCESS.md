# Sidebets Blackjack — Work Log and Access Guide

Last updated: 2026-03-31

This file explains what has been changed during the current approval-readiness push, where the important files live, and how to inspect the current repo state.

---

## 1. Commits made during this session

### `e4899cc` — `docs: lock submission ruleset direction`
Changed:
- `docs/GAME_SPEC.md`
- `docs/REPLAY_EVENT_SCHEMA.md`
- `docs/APPROVAL_RULESET_LOCK.md`

Purpose:
- lock the working submission direction
- record that the target is real blackjack with splits and side bets
- lock the RTP ceiling below 98.0%
- update rules/replay notes so they stop drifting

### `6724a48` — `chore: add approval workflow helpers`
Changed:
- `.openclaw-skills/stake-blackjack-approval/`
- `.openclaw-skills/split-blackjack-engine/`
- `.openclaw-skills/stake-math-bundle/`
- `.openclaw-skills/stake-frontend-approval/`
- `SUBMISSION_TASKS.md`
- `scripts/rtp_checkpoint.py`
- `tests/test_split_rules.py`

Purpose:
- add repo-local skills so the project context is easier to hold onto
- add a task board for submission work
- add a lightweight RTP checkpoint script
- add initial proof tests around split-related repo changes

### `c0aadd5` — `chore: add visible work proof skill`
Changed:
- `.openclaw-skills/visible-work-proof/`

Purpose:
- force short proof-of-work discipline in updates
- prefer concrete evidence over reassurance

### `a8c354a` — `feat: add first-pass split blackjack support`
Changed:
- `math/engine.py`
- `tests/test_math_split_engine.py`

Purpose:
- add first-pass split-aware math-engine support
- add tests around split creation and split-hand settlement behavior

---

## 2. Important files now in the repo

## Core docs
- `docs/APPROVAL_RULESET_LOCK.md`
- `docs/GAME_SPEC.md`
- `docs/REPLAY_EVENT_SCHEMA.md`
- `SUBMISSION_TASKS.md`
- `WORK_LOG_AND_ACCESS.md`

## Repo-local skills
All are under:
- `.openclaw-skills/`

Skills created:
- `.openclaw-skills/stake-blackjack-approval/`
- `.openclaw-skills/split-blackjack-engine/`
- `.openclaw-skills/stake-math-bundle/`
- `.openclaw-skills/stake-frontend-approval/`
- `.openclaw-skills/visible-work-proof/`

## Frontend runtime files
- `game/src/game/engine.js`
- `game/src/game/store.js`
- `game/src/game/roundSettlement.js`
- `game/src/ui/GameTable.svelte`

## Math/export files
- `math/engine.py`
- `math/simulate.py`
- `stake_export.py`
- `exact_sidebet_math.py`
- `scripts/rtp_checkpoint.py`

## Tests
- `tests/test_split_rules.py`
- `tests/test_math_split_engine.py`
- existing repo tests under `game/` and `tests/`

---

## 3. What changed functionally

## Rules/spec direction
Locked the project around:
- real blackjack
- Perfect Pairs and 21+3 side bets
- splits included
- split hands can be hit multiple times
- split aces get one card only
- no resplit aces
- dealer hits soft 17
- blackjack pays 3:2
- base RTP must remain below 98.0%

## Frontend implementation work
A first pass of split plumbing was added locally in the frontend/runtime side, including work in:
- `game/src/game/engine.js`
- `game/src/game/store.js`
- `game/src/game/roundSettlement.js`
- `game/src/ui/GameTable.svelte`

This includes:
- hand-state helpers for split-oriented behavior
- split button no longer being purely placeholder in the edited working tree
- UI/rules copy changes reflecting H17 + split behavior

Important: at the time this file was written, frontend work exists in the working tree and should be reviewed/committed as a separate step if not already included in later commits.

## Math engine work
Committed first-pass split support in `math/engine.py`, including:
- hand IDs / split metadata
- split creation helper
- split-aware settlement
- prevention of split-hand 21 paying as natural blackjack
- tests in `tests/test_math_split_engine.py`

---

## 4. How to inspect everything

## See commit history
Run:

```bash
git log --oneline --decorate -n 20
```

## See current working tree status
Run:

```bash
git status --short
```

## See exact files changed in a commit
Examples:

```bash
git show --stat e4899cc
git show --stat 6724a48
git show --stat c0aadd5
git show --stat a8c354a
```

## Open the key docs
```bash
open docs/APPROVAL_RULESET_LOCK.md
open SUBMISSION_TASKS.md
open WORK_LOG_AND_ACCESS.md
```

## Open the repo-local skills folder
```bash
open .openclaw-skills
```

## Run frontend tests
```bash
cd game
npm test
```

## Run the math split tests
```bash
cd <repo-root>
python3 -m unittest tests/test_math_split_engine.py
```

## Run the RTP checkpoint helper
```bash
python3 scripts/rtp_checkpoint.py stake_submission_bundle/math/base.csv
```

---

## 5. About “push every change to git”

All committed changes are already in local git history.

What "push" means depends on whether this repo has a configured remote. To check:

```bash
git remote -v
```

If a remote exists, pushing is:

```bash
git push
```

If no remote exists, the work is still committed locally but not uploaded anywhere yet.

---

## 6. Current state summary

Committed:
- docs/rules direction lock
- approval workflow helper layer
- visible-work-proof skill
- first-pass split support in Python math engine

In progress / next:
- tighten and commit frontend split plumbing
- continue aligning frontend state with split-aware engine behavior
- continue math/export alignment
- continue submission-readiness cleanup
