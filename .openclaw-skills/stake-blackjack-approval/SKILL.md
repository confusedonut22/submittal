---
name: stake-blackjack-approval
description: "Make Sidebets Blackjack approval-ready for Stake Engine. Use when working on this repo's blackjack approval effort, especially for: (1) locking or checking rules against the RTP ceiling, (2) implementing split-capable real blackjack, (3) aligning frontend, math, and docs, (4) assessing Stake approval constraints like statelessness/static outcome packaging, or (5) preparing submission checklists and artifacts."
---

# Stake Blackjack Approval

Use this skill for work on `degen-blackjack` when the task touches approval readiness, RTP guardrails, or alignment between the frontend, math, and submission docs.

## Core product lock

Treat these as the current source of truth unless a newer repo document explicitly replaces them:

- `docs/APPROVAL_RULESET_LOCK.md`
- `docs/GAME_SPEC.md`
- `docs/REPLAY_EVENT_SCHEMA.md`

Current locked direction:
- real blackjack, not pseudo-blackjack
- Sidebets Blackjack includes Perfect Pairs and 21+3
- splits are included
- split hands may be hit multiple times
- split aces receive one card only
- no resplit aces
- dealer hits soft 17
- blackjack pays 3:2
- target base RTP is **below 98.0%** with safety margin
- late surrender is not an RTP-reduction lever; it increases player RTP

## Working priorities

Apply work in this order unless the current task clearly needs something else:

1. keep frontend rules text, controls, and behavior aligned
2. keep math/engine behavior aligned with the locked rules
3. prevent base RTP from exceeding 98.0%
4. prefer stateless / approval-safe structures over clever runtime-only logic
5. preserve room for replay, but do not let replay block core engine/frontend correctness unless the user explicitly prioritizes it

## Repo focus files

Read/update these first when relevant:

### Frontend runtime
- `game/src/game/engine.js`
- `game/src/game/store.js`
- `game/src/game/roundSettlement.js`
- `game/src/ui/GameTable.svelte`
- `game/src/game/rules.js`

### Math / export
- `math/engine.py`
- `math/simulate.py`
- `stake_export.py`
- `exact_sidebet_math.py`
- `tests/`

### Submission docs
- `docs/APPROVAL_RULESET_LOCK.md`
- `docs/GAME_SPEC.md`
- `docs/REPLAY_EVENT_SCHEMA.md`
- `docs/STAKE_FRONTEND_READINESS.md`
- `docs/STAKE_MATH_SCAFFOLD.md`

## Implementation heuristics

### When changing gameplay

Update all three layers together when possible:
- frontend controls/state
- math or engine logic
- docs/rules text

Do not leave the UI saying one thing while the engine does another.

### When touching splits

Verify at minimum:
- split eligibility
- split-hand action order
- split-hand 21 does not incorrectly pay as natural blackjack
- split aces are locked correctly
- total wager updates correctly when splitting/doubling
- result summary still makes sense for multi-hand rounds

### When touching RTP-sensitive rules

Prefer lowering RTP through rules such as:
- H17 over S17
- limiting resplits
- limiting favorable split/double options if needed

Do not treat surrender as an RTP-lowering mechanism.

### When making approval claims

Prefer wording like:
- "approval-ready direction"
- "approval-focused"
- "submission scaffold"

Avoid claiming final approval certainty unless there is explicit reviewer confirmation.

## Commit discipline

After meaningful edits, commit progress in small logical chunks.
Examples:
- `feat: add split-capable hand state to frontend engine`
- `fix: prevent split 21 from paying natural blackjack`
- `docs: align rules copy with locked blackjack submission rules`

## Visible progress format

If the user wants proof of work, answer with:
- current file being changed
- last command run
- last commit / test result

Keep it short and concrete.

## References

For the current repo-specific working context, read:
- `references/current-context.md`
