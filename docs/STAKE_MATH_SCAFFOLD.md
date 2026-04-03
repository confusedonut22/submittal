# Stake Math Scaffold

This repo now includes a deterministic draft export path in
[stake_export.py](stake_export.py).

## What it does

- uses a seeded shoe so simulation runs are reproducible
- emits machine-readable round events
- aggregates repeated outcomes into a deterministic lookup CSV
- writes a draft `index.json`
- writes `base.csv`
- writes `base.jsonl`
- now attempts to compress to `base.jsonl.zst`
  - first with native `zstandard`
  - then with the local `.venv-zstd` helper if present

## Current limits

- this is scaffolding, not a final Stake submission bundle
- `payoutMultiplier` is currently normalized against the actual total round wager
  - base bet
  - doubles
  - insurance
  - optional side bets
- final Stake packaging still needs mode modeling that resolves variable-cost rounds cleanly
- the current base-game RTP should be treated as simulation-backed, not exact finite-shoe math
  - published ruleset: H17, 6 decks, double hard 11 only, no DAS, no resplit aces
  - verified RTP: ~97.9% across multiple 2M+ round runs (safely below 98.0% Stake ceiling)
- exact six-deck side-bet RTP is now computed in [exact_sidebet_math.py](exact_sidebet_math.py)
  - Perfect Pairs: `86.4952%`
  - 21+3: `85.7029%`
- wallet authority, RGS calls, replay serving, and certified backend RNG are still out of scope

## Example

```bash
python3 stake_export.py --rounds 5000 --seed 1337 --out-dir stake_export_draft
```

100,000-round artifacts now exist at:

- [docs/simulation_100k.txt](docs/simulation_100k.txt)
- [stake_export_100k_auto2/index.json](stake_export_100k_auto2/index.json)
- [stake_export_100k_auto2/base.csv](stake_export_100k_auto2/base.csv)
- [stake_export_100k_auto2/base.jsonl](stake_export_100k_auto2/base.jsonl)
- [stake_export_100k_auto2/base.jsonl.zst](stake_export_100k_auto2/base.jsonl.zst)
- [stake_export_100k_auto2/compression.txt](stake_export_100k_auto2/compression.txt)

1,000,000-round simulation artifacts now exist at:

- [docs/simulation_1m.txt](docs/simulation_1m.txt)
- [docs/simulation_1m_math.txt](docs/simulation_1m_math.txt)

## Output

- `index.json`
- `base.csv`
- `base.jsonl`
- `compression.txt`

If `zstandard` is installed, the scaffold also writes `base.jsonl.zst`.

`base.csv` now uses the official three-column shape:

- `simulation_number`
- `round_probability`
- `payout_multiplier`

The current `round_probability` values are still simulation-frequency counts, not final certified math weights.
