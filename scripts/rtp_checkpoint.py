#!/usr/bin/env python3
"""Quick RTP checkpoint helper for Sidebets Blackjack.

This is a lightweight workflow helper, not final approval math.
It exists so rule/math changes can be checked quickly against the
base-game < 98.0% target during development.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path


def summarize_csv(path: Path) -> tuple[int, float]:
    total_weight = 0
    weighted_sum = 0
    with path.open(encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            weight = int(row["round_probability"])
            multiplier = int(row["payout_multiplier"])
            total_weight += weight
            weighted_sum += weight * multiplier
    if total_weight == 0:
        raise ValueError("No rows found in CSV")
    return total_weight, weighted_sum / total_weight


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: rtp_checkpoint.py <base.csv>")
        return 2
    path = Path(sys.argv[1])
    total_weight, avg_multiplier = summarize_csv(path)
    print(f"rows: {total_weight}")
    print(f"avg payout multiplier: {avg_multiplier:.6f}")
    print(f"estimated RTP: {avg_multiplier:.6f}%")
    if avg_multiplier >= 98.0:
        print("WARNING: base RTP is at or above the 98.0% ceiling")
        return 1
    print("OK: base RTP is below the 98.0% ceiling")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
