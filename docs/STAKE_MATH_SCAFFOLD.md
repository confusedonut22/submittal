# Stake Math Scaffold

This repo now includes a deterministic draft export path in
[/Users/gerryturnbow/degen-blackjack/stake_export.py](/Users/gerryturnbow/degen-blackjack/stake_export.py).

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
  - latest 1,000,000-round runs: `98.61%` and `98.72%`
  - displayed project estimate: `98.7%`
- exact six-deck side-bet RTP is now computed in [/Users/gerryturnbow/degen-blackjack/exact_sidebet_math.py](/Users/gerryturnbow/degen-blackjack/exact_sidebet_math.py)
  - Perfect Pairs: `86.4952%`
  - 21+3: `85.7029%`
- wallet authority, RGS calls, replay serving, and certified backend RNG are still out of scope

## Example

```bash
python3 /Users/gerryturnbow/degen-blackjack/stake_export.py --rounds 5000 --seed 1337 --out-dir /Users/gerryturnbow/degen-blackjack/stake_export_draft
```

100,000-round artifacts now exist at:

- [/Users/gerryturnbow/degen-blackjack/docs/simulation_100k.txt](/Users/gerryturnbow/degen-blackjack/docs/simulation_100k.txt)
- [/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/index.json](/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/index.json)
- [/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/base.csv](/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/base.csv)
- [/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/base.jsonl](/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/base.jsonl)
- [/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/base.jsonl.zst](/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/base.jsonl.zst)
- [/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/compression.txt](/Users/gerryturnbow/degen-blackjack/stake_export_100k_auto2/compression.txt)

1,000,000-round simulation artifacts now exist at:

- [/Users/gerryturnbow/degen-blackjack/docs/simulation_1m.txt](/Users/gerryturnbow/degen-blackjack/docs/simulation_1m.txt)
- [/Users/gerryturnbow/degen-blackjack/docs/simulation_1m_math.txt](/Users/gerryturnbow/degen-blackjack/docs/simulation_1m_math.txt)

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
