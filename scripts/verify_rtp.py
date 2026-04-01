"""
Degen Blackjack — RTP Verification Script
Chad Labs / Stake Engine RGS

Verifies base-game RTP under the approved ruleset:
  1. H17  — dealer hits soft 17
  2. ALLOW_DAS = False   — no double after split
  3. ALLOW_RESPLIT = False — no resplitting
  4. Split aces locked to one card

Uses the same methodology as stake_export.py: each round's
payoutMultiplier = total_returned / total_wagered, then the overall
RTP = average payoutMultiplier across all rounds.

This captures the wager-weighted RTP that includes the cost of
doubles and splits, matching what Stake Engine evaluates.

Target: RTP < 98.0% (Stake Engine hard ceiling).
"""

import sys
import os
import importlib.util

# ─── Load math/engine.py ────────────────────────────────────────────────────
_submittal_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_engine_path = os.path.join(_submittal_root, "math", "engine.py")
_spec = importlib.util.spec_from_file_location("degen_math_engine", _engine_path)
_engine = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_engine)

Shoe         = _engine.Shoe
hand_value   = _engine.hand_value
is_blackjack = _engine.is_blackjack
is_soft      = _engine.is_soft
dealer_play  = _engine.dealer_play
MONEY_SCALE  = _engine.MONEY_SCALE
ALLOW_DAS    = _engine.ALLOW_DAS
ALLOW_RESPLIT = _engine.ALLOW_RESPLIT

RTP_CEILING = 98.0


# ─── BASIC STRATEGY (matches stake_export.py) ───────────────────────────────

def basic_strategy_action(player_cards, dealer_up_card, *, allow_split=True, allow_double=True):
    """
    Simplified basic strategy matching stake_export.py.
    Returns: 'hit', 'stand', 'double', or 'split'.
    """
    dv = dealer_up_card.value
    if dealer_up_card.rank in ("J", "Q", "K"):
        dv = 10

    # ── Pair split check ─────────────────────────────────────────────────
    if allow_split and len(player_cards) == 2 and player_cards[0].rank == player_cards[1].rank:
        pair_rank = player_cards[0].rank
        if pair_rank in ("A", "8"):
            return "split"
        if pair_rank in ("4", "5", "10", "J", "Q", "K"):
            pass  # fall through
        elif pair_rank in ("2", "3", "6", "7") and 2 <= dv <= 7:
            return "split"
        elif pair_rank == "9" and dv in (2, 3, 4, 5, 6, 8, 9):
            return "split"

    # ── Standard hard/soft strategy ──────────────────────────────────────
    pv = hand_value(player_cards)
    soft = is_soft(player_cards)
    can_double = allow_double and len(player_cards) == 2

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


# ─── SIMULATION ─────────────────────────────────────────────────────────────

def simulate_base_game(num_rounds: int = 1_000_000, bet: int = MONEY_SCALE):
    """
    Simulates base game with H17, splits, no-DAS, no-resplit.
    Uses stake_export-compatible methodology:
      RTP = mean(payoutMultiplier) across all rounds
      where payoutMultiplier = total_returned / total_wagered per round.
    """
    shoe = Shoe()
    payout_multiplier_sum = 0.0

    for _ in range(num_rounds):
        round_wagered = bet
        round_returned = 0
        player_cards = [shoe.draw(), shoe.draw()]
        dealer_cards = [shoe.draw(), shoe.draw()]

        # ── Naturals ─────────────────────────────────────────────────────
        pbj = is_blackjack(player_cards)
        dbj = is_blackjack(dealer_cards)

        if pbj and dbj:
            round_returned = bet  # push
            payout_multiplier_sum += round_returned / round_wagered
            continue
        if pbj:
            round_returned = bet + int(bet * 1.5)
            payout_multiplier_sum += round_returned / round_wagered
            continue
        if dbj:
            payout_multiplier_sum += 0.0  # lose everything
            continue

        # ── Check for split ──────────────────────────────────────────────
        action = basic_strategy_action(player_cards, dealer_cards[0])
        hands = []  # list of (cards, hand_bet, is_split, split_aces)

        if action == "split":
            c1, c2 = player_cards
            splitting_aces = (c1.rank == "A" and c2.rank == "A")
            round_wagered += bet  # split costs extra bet

            hand1_cards = [c1, shoe.draw()]
            hand2_cards = [c2, shoe.draw()]
            hands.append((hand1_cards, bet, True, splitting_aces))
            hands.append((hand2_cards, bet, True, splitting_aces))
        else:
            hands.append((player_cards, bet, False, False))

        # ── Play all hands ───────────────────────────────────────────────
        all_busted = True
        played_hands = []

        for (cards, hand_bet, is_split, split_aces) in hands:
            if split_aces:
                # Locked — one card already drawn, no further action
                if hand_value(cards) <= 21:
                    all_busted = False
                played_hands.append((hand_bet, cards, is_split))
                continue

            while True:
                if hand_value(cards) >= 21:
                    break
                act = basic_strategy_action(
                    cards, dealer_cards[0],
                    allow_split=False,
                    allow_double=not is_split,  # DAS=False
                )
                if act == "stand":
                    break
                elif act == "double":
                    round_wagered += hand_bet
                    hand_bet *= 2
                    cards.append(shoe.draw())
                    break
                elif act == "hit":
                    cards.append(shoe.draw())
                else:
                    break

            pv = hand_value(cards)
            if pv <= 21:
                all_busted = False
            played_hands.append((hand_bet, cards, is_split))

        # ── Dealer plays ─────────────────────────────────────────────────
        if all_busted:
            payout_multiplier_sum += 0.0
            continue

        dealer_cards = dealer_play(dealer_cards, shoe)
        dv = hand_value(dealer_cards)

        # ── Resolve ──────────────────────────────────────────────────────
        for (hand_bet, final_cards, is_split) in played_hands:
            pv = hand_value(final_cards)
            if pv > 21:
                continue  # bust
            if dv > 21:
                round_returned += hand_bet * 2
            elif pv > dv:
                round_returned += hand_bet * 2
            elif pv == dv:
                round_returned += hand_bet

        payout_multiplier_sum += round_returned / round_wagered if round_wagered > 0 else 0.0

    rtp = payout_multiplier_sum / num_rounds * 100
    return rtp


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    num_rounds = 1_000_000
    if len(sys.argv) > 1:
        try:
            num_rounds = int(sys.argv[1])
        except ValueError:
            pass

    print("=" * 60)
    print("  Degen Blackjack — RTP Verification")
    print("  Chad Labs / Stake Engine Approval Check")
    print("=" * 60)
    print(f"  Dealer rule:   H17 — dealer hits soft 17")
    print(f"  ALLOW_DAS:     {ALLOW_DAS}   (no double after split)")
    print(f"  ALLOW_RESPLIT: {ALLOW_RESPLIT}  (no resplitting)")
    print(f"  Splits:        Enabled (aces locked to 1 card)")
    print(f"  Decks:         6")
    print(f"  Hands:         {num_rounds:,}")
    print(f"  RTP Ceiling:   {RTP_CEILING:.1f}%")
    print(f"  Method:        mean(payoutMultiplier) per round")
    print("=" * 60)
    print()

    print(f"Running {num_rounds:,} rounds...")
    rtp = simulate_base_game(num_rounds)
    print()
    print(f"  Simulated RTP:  {rtp:.4f}%")
    print()

    if rtp < RTP_CEILING:
        margin = RTP_CEILING - rtp
        print(f"  RESULT: PASS — RTP {rtp:.4f}% is UNDER the {RTP_CEILING:.1f}% ceiling.")
        print(f"          Safety margin: {margin:.4f}%")
        print("=" * 60)
        return 0
    else:
        gap = rtp - RTP_CEILING
        print(f"  RESULT: FAIL — RTP {rtp:.4f}% exceeds ceiling by {gap:.4f}%.")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
