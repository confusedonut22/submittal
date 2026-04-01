"""
Deterministic Stake-style math export scaffold for Degen Blackjack.

This is draft scaffolding, not a final Stake submission bundle.
It emits reproducible round records, a weights CSV, and an index.json
that documents the current assumptions. Compression to .jsonl.zst is
only performed when the optional `zstandard` dependency is installed.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List

from engine import (
    BJ_MULTIPLIER,
    MONEY_SCALE,
    Card,
    HandResult,
    RoundState,
    Shoe,
    SideBetType,
    complete_round,
    hand_value,
    is_blackjack,
    is_soft,
)


def card_token(card: Card) -> str:
    return f"{card.rank}{card.suit[0]}"


def basic_strategy_action(player_cards: List[Card], dealer_up_card: Card) -> str:
    pv = hand_value(player_cards)
    soft = is_soft(player_cards)
    can_double = len(player_cards) == 2

    dv = dealer_up_card.value
    if dealer_up_card.rank in ("J", "Q", "K"):
        dv = 10

    if pv >= 17:
        return "stand"
    if pv <= 8:
        return "hit"

    if soft:
        if pv >= 19:
            return "stand"
        if pv == 18:
            return "hit" if dv >= 9 else "stand"
        return "hit"

    if pv >= 13 and dv <= 6:
        return "stand"
    if pv == 12 and 4 <= dv <= 6:
        return "stand"
    if pv == 11 and can_double:
        return "double"
    if pv == 10 and dv <= 9 and can_double:
        return "double"
    if pv == 9 and 3 <= dv <= 6 and can_double:
        return "double"
    return "hit"


def evaluate_initial_resolution(hand, dealer_cards: List[Card]) -> None:
    player_bj = is_blackjack(hand.cards)
    dealer_bj = is_blackjack(dealer_cards)

    if player_bj and dealer_bj:
        hand.result = HandResult.PUSH
        hand.payout = hand.bet
    elif player_bj:
        hand.result = HandResult.BLACKJACK
        hand.payout = hand.bet + int(hand.bet * BJ_MULTIPLIER)
    elif dealer_bj:
        hand.result = HandResult.LOSE
        hand.payout = 0


def play_round_record(
    *,
    shoe: Shoe,
    base_bet: int = MONEY_SCALE,
    perfect_pairs_bet: int = 0,
    twenty_one_plus_three_bet: int = 0,
    take_insurance: bool = False,
) -> Dict:
    from engine import deal_round  # local import to keep module boundary narrow

    side_bets = {}
    if perfect_pairs_bet:
        side_bets[SideBetType.PERFECT_PAIRS] = perfect_pairs_bet
    if twenty_one_plus_three_bet:
        side_bets[SideBetType.TWENTY_ONE_PLUS_THREE] = twenty_one_plus_three_bet

    state: RoundState = deal_round(shoe, [{"bet": base_bet, "side_bets": side_bets}])
    hand = state.player_hands[0]
    events: List[Dict] = []

    events.append(
        {
            "type": "initialDeal",
            "dealerUp": card_token(state.dealer_cards[0]),
            "dealerHole": card_token(state.dealer_cards[1]),
            "playerCards": [card_token(card) for card in hand.cards],
            "sideBets": {
                "perfectPairs": perfect_pairs_bet,
                "twentyOnePlusThree": twenty_one_plus_three_bet,
            },
            "insuranceOffered": state.insurance_offered,
        }
    )

    if hand.side_bet_results:
        events.append(
            {
                "type": "sideBetsResolved",
                "results": [
                    {
                        "betType": result.bet_type.value,
                        "won": result.won,
                        "name": result.name,
                        "multiplier": result.multiplier,
                        "payout": result.payout,
                    }
                    for result in hand.side_bet_results
                ],
            }
        )

    if state.insurance_offered and take_insurance:
        state.insurance_taken = True
        events.append(
            {
                "type": "insuranceTaken",
                "amount": state.insurance_amount,
            }
        )

    evaluate_initial_resolution(hand, state.dealer_cards)
    if hand.result is not None:
        events.append(
            {
                "type": "initialResolution",
                "result": hand.result.value,
                "payout": hand.payout,
            }
        )
        state = complete_round(state, shoe)
    else:
        while hand.result is None:
            action = basic_strategy_action(hand.cards, state.dealer_cards[0])
            if action == "stand":
                events.append({"type": "playerAction", "action": "stand"})
                break
            if action == "double":
                state.total_wagered += hand.bet
                hand.bet *= 2
                hand.doubled = True
                drawn = shoe.draw()
                hand.cards.append(drawn)
                events.append(
                    {
                        "type": "playerAction",
                        "action": "double",
                        "card": card_token(drawn),
                        "value": hand_value(hand.cards),
                    }
                )
                if hand_value(hand.cards) > 21:
                    hand.result = HandResult.BUST
                    hand.payout = 0
                break

            drawn = shoe.draw()
            hand.cards.append(drawn)
            events.append(
                {
                    "type": "playerAction",
                    "action": "hit",
                    "card": card_token(drawn),
                    "value": hand_value(hand.cards),
                }
            )
            if hand_value(hand.cards) > 21:
                hand.result = HandResult.BUST
                hand.payout = 0
                break

        state = complete_round(state, shoe)

    events.append(
        {
            "type": "dealerFinal",
            "cards": [card_token(card) for card in state.dealer_cards],
            "value": hand_value(state.dealer_cards),
        }
    )

    events.append(
        {
            "type": "roundSettlement",
            "handResult": hand.result.value if hand.result else None,
            "handPayout": hand.payout,
            "totalWagered": state.total_wagered,
            "totalReturned": state.total_returned,
            "insuranceTaken": state.insurance_taken,
        }
    )

    payout_multiplier = int(round((state.total_returned / state.total_wagered) * 100)) if state.total_wagered else 0

    return {
        "events": events,
        "payoutMultiplier": payout_multiplier,
        "totalWagered": state.total_wagered,
        "totalReturned": state.total_returned,
    }


def record_id_for(events: List[Dict], payout_multiplier: int) -> str:
    payload = json.dumps({"events": events, "payoutMultiplier": payout_multiplier}, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def simulate_bundle(
    *,
    rounds: int,
    seed: int,
    base_bet: int = MONEY_SCALE,
    perfect_pairs_bet: int = 0,
    twenty_one_plus_three_bet: int = 0,
    take_insurance: bool = False,
) -> List[Dict]:
    import random

    rng = random.Random(seed)
    shoe = Shoe(rng=rng)
    records: List[Dict] = []

    for _ in range(rounds):
        record = play_round_record(
            shoe=shoe,
            base_bet=base_bet,
            perfect_pairs_bet=perfect_pairs_bet,
            twenty_one_plus_three_bet=twenty_one_plus_three_bet,
            take_insurance=take_insurance,
        )
        record["id"] = record_id_for(record["events"], record["payoutMultiplier"])
        records.append(record)

    return records


def collapse_records(records: Iterable[Dict]) -> List[Dict]:
    weights = Counter(record["id"] for record in records)
    unique: Dict[str, Dict] = {}
    for record in records:
        unique.setdefault(record["id"], record)

    collapsed = []
    for simulation_number, record_id in enumerate(sorted(unique.keys()), start=1):
        record = unique[record_id]
        collapsed.append(
            {
                "id": simulation_number,
                "recordId": record_id,
                "events": record["events"],
                "payoutMultiplier": record["payoutMultiplier"],
                "probability": weights[record_id],
                "totalWagered": record["totalWagered"],
                "totalReturned": record["totalReturned"],
            }
        )
    return collapsed


def compress_bundle_jsonl(base_jsonl: Path, compressed_path: Path) -> str:
    try:
        import zstandard  # type: ignore

        compressor = zstandard.ZstdCompressor(level=10)
        with base_jsonl.open("rb") as src, compressed_path.open("wb") as dst:
            dst.write(compressor.compress(src.read()))
        return "native-zstandard"
    except Exception as native_exc:
        helper_python = Path(__file__).resolve().parent / ".venv-zstd" / "bin" / "python"
        if helper_python.exists():
            script = (
                "from pathlib import Path\n"
                "import sys\n"
                "import zstandard as zstd\n"
                "src = Path(sys.argv[1])\n"
                "dst = Path(sys.argv[2])\n"
                "cctx = zstd.ZstdCompressor(level=10)\n"
                "with src.open('rb') as fin, dst.open('wb') as fout:\n"
                "    cctx.copy_stream(fin, fout)\n"
            )
            try:
                subprocess.run(
                    [str(helper_python), "-c", script, str(base_jsonl), str(compressed_path)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                return "local-zstandard-helper"
            except Exception:
                pass
        raise native_exc


def write_bundle(out_dir: Path, records: List[Dict]) -> Dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    collapsed = collapse_records(records)

    base_jsonl = out_dir / "base.jsonl"
    with base_jsonl.open("w", encoding="utf-8") as handle:
        for record in collapsed:
            json.dump(
                {
                    "id": record["id"],
                    "events": record["events"],
                    "payoutMultiplier": record["payoutMultiplier"],
                },
                handle,
                separators=(",", ":"),
            )
            handle.write("\n")

    base_csv = out_dir / "base.csv"
    with base_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["simulation_number", "round_probability", "payout_multiplier"])
        for record in collapsed:
            writer.writerow([record["id"], record["probability"], record["payoutMultiplier"]])

    index_json = out_dir / "index.json"
    result_filename = "base.jsonl.zst"
    with index_json.open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "bundleVersion": 1,
                "draft": True,
                "notes": [
                    "Draft Stake-style scaffold for Degen Blackjack.",
                    "simulation_number is a sequential integer id for each unique round record.",
                    "round_probability currently uses deterministic simulation frequency counts, not final published math weights.",
                    "payoutMultiplier is normalized against total round wager, including doubles and insurance when present.",
                    "Current scaffold only exports single-hand round records and is not yet the final split-capable submission bundle.",
                    "Side bets should be disclosed and validated separately from the base-game RTP.",
                    "Compression to .jsonl.zst requires the optional zstandard dependency.",
                ],
                "modes": [
                    {
                        "name": "base",
                        "cost": 1,
                        "lookupTableFile": "base.csv",
                        "gameLogicFile": result_filename,
                    }
                ],
            },
            handle,
            indent=2,
        )

    compression_note = out_dir / "compression.txt"
    try:
        compressed_path = out_dir / "base.jsonl.zst"
        method = compress_bundle_jsonl(base_jsonl, compressed_path)
        compression_note.write_text(
            f"Compressed bundle written to base.jsonl.zst via {method}\n",
            encoding="utf-8",
        )
    except Exception as exc:
        result_filename = "base.jsonl"
        index_payload = json.loads(index_json.read_text(encoding="utf-8"))
        index_payload["modes"][0]["gameLogicFile"] = result_filename
        index_json.write_text(json.dumps(index_payload, indent=2), encoding="utf-8")
        compression_note.write_text(
            f"Compression fallback used: {type(exc).__name__}: {exc}\n",
            encoding="utf-8",
        )

    return {
        "index": index_json,
        "csv": base_csv,
        "jsonl": base_jsonl,
        "compression_note": compression_note,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Emit a deterministic Stake-style draft math bundle.")
    parser.add_argument("--rounds", type=int, default=5000)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--out-dir", default="stake_export_draft")
    parser.add_argument("--base-bet", type=int, default=MONEY_SCALE)
    parser.add_argument("--perfect-pairs-bet", type=int, default=0)
    parser.add_argument("--twenty-one-plus-three-bet", type=int, default=0)
    parser.add_argument("--take-insurance", action="store_true")
    args = parser.parse_args()

    records = simulate_bundle(
        rounds=args.rounds,
        seed=args.seed,
        base_bet=args.base_bet,
        perfect_pairs_bet=args.perfect_pairs_bet,
        twenty_one_plus_three_bet=args.twenty_one_plus_three_bet,
        take_insurance=args.take_insurance,
    )
    written = write_bundle(Path(args.out_dir), records)
    print(json.dumps({key: str(value) for key, value in written.items()}, indent=2))


if __name__ == "__main__":
    main()
