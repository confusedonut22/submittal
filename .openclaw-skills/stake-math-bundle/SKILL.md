---
name: stake-math-bundle
description: "Prepare Sidebets Blackjack math/export artifacts for Stake-style submission work. Use when working on: (1) RTP validation, (2) payout multiplier definitions, (3) simulation/export scaffolds, (4) weight tables or lookup CSVs, (5) side-bet math checks, or (6) aligning the math bundle with the locked blackjack rules and approval constraints."
---

# Stake Math Bundle

Use this skill for math/export work in:
- `math/engine.py`
- `math/simulate.py`
- `stake_export.py`
- `exact_sidebet_math.py`
- `tests/`

## Primary goals

- keep base-game RTP below 98.0%
- keep side-bet RTP documentation accurate
- align export assumptions with the locked ruleset
- avoid claiming that draft simulation scaffolds are final approval-grade math unless they truly are

## Guardrails

- H17 helps reduce RTP relative to S17
- surrender increases player RTP; do not use it as an RTP-lowering lever
- split-friendly rules can increase RTP; validate before freezing favorable options like DAS/resplits
- when changing payouts or rule toggles, update docs too

## Output discipline

When describing math artifacts, distinguish clearly between:
- draft simulation-backed scaffolds
- exact side-bet combinatorics
- final/published/static weight tables

## Minimum math checks

After meaningful changes, verify:
- base RTP estimate remains below 98.0%
- side-bet payout tables still match declared values
- payout multipliers are normalized consistently
- CSV / bundle fields still match the repo's documented contract

## References

Read `references/checklist.md` for the working checklist.
