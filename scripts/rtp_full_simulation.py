"""
Degen Blackjack — Full RTP Simulation (with splits)
Chad Labs / Stake Engine RGS

Complete basic-strategy simulation including:
  - H17 dealer rule
  - Splits (pair splitting with basic strategy)
  - No DAS (no double after split)
  - No resplit
  - Split aces locked (one card only)
  - Configurable double restriction (any two cards vs hard 9-11 only)

Runs 2,000,000 hands and reports resulting RTP.
Target: RTP < 98.0% (Stake Engine hard ceiling).
"""

import sys
import os
import random
import importlib.util

# ─── Load math/engine.py ────────────────────────────────────────────────────
_submittal_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_engine_path = os.path.join(_submittal_root, "math", "engine.py")
_spec = importlib.util.spec_from_file_location("degen_math_engine", _engine_path)
_engine = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_engine)

Shoe         = _engine.Shoe
Card         = _engine.Card
hand_value   = _engine.hand_value
is_blackjack = _engine.is_blackjack
is_soft      = _engine.is_soft
is_bust      = _engine.is_bust
dealer_play  = _engine.dealer_play
MONEY_SCALE  = _engine.MONEY_SCALE

# ─── CONFIGURATION ──────────────────────────────────────────────────────────
ALLOW_DAS         = False   # No double after split
ALLOW_RESPLIT      = False   # No resplitting
DOUBLE_HARD_9_11   = True    # Restrict doubles to hard 9-11 only
RTP_CEILING        = 98.0


# ─── BASIC STRATEGY (full, with splits) ─────────────────────────────────────

def dealer_upcard_value(card):
    """Get dealer upcard value for strategy lookup (Ace=11, face=10)."""
    if card.rank in ("J", "Q", "K"):
        return 10
    return card.value


def can_double(player_cards, is_split_hand=False, restrict_9_11=None):
    """Check if doubling is allowed."""
    if restrict_9_11 is None:
        restrict_9_11 = DOUBLE_HARD_9_11
    if len(player_cards) != 2:
        return False
    if is_split_hand and not ALLOW_DAS:
        return False
    if restrict_9_11:
        pv = hand_value(player_cards)
        soft = is_soft(player_cards)
        if soft:
            return False  # No doubling on soft hands
        if pv < 9 or pv > 11:
            return False  # Only hard 9, 10, 11
    return True


def should_split(player_cards, dealer_up_val):
    """Basic strategy split decisions for H17."""
    if len(player_cards) != 2:
        return False
    c1, c2 = player_cards
    if c1.rank != c2.rank:
        # Also check 10-value pairs
        v1 = min(10, c1.value)
        v2 = min(10, c2.value)
        if v1 != v2:
            return False
        # 10-value pair (e.g. 10-K) — never split
        if v1 == 10:
            return False

    rank = c1.rank

    # Aces — always split
    if rank == "A":
        return True
    # 8s — always split
    if rank == "8":
        return True
    # 10s, Js, Qs, Ks — never split
    if rank in ("10", "J", "Q", "K"):
        return False
    # 9s — split vs 2-9 except 7
    if rank == "9":
        return dealer_up_val not in (7, 10, 11)
    # 7s — split vs 2-7
    if rank == "7":
        return dealer_up_val <= 7
    # 6s — split vs 2-6 (no DAS makes 6s less favorable)
    if rank == "6":
        return dealer_up_val <= 6
    # 5s — never split (double instead)
    if rank == "5":
        return False
    # 4s — never split without DAS
    if rank == "4":
        return False
    # 3s — split vs 2-7 with DAS, vs 4-7 without
    if rank == "3":
        if ALLOW_DAS:
            return dealer_up_val <= 7
        return 4 <= dealer_up_val <= 7
    # 2s — split vs 2-7 with DAS, vs 4-7 without
    if rank == "2":
        if ALLOW_DAS:
            return dealer_up_val <= 7
        return 4 <= dealer_up_val <= 7

    return False


def basic_strategy_action(player_cards, dealer_up_val, is_split_hand=False):
    """
    Full H17 basic strategy.
    Returns: 'hit', 'stand', or 'double'.
    """
    pv = hand_value(player_cards)
    soft = is_soft(player_cards)
    dbl_ok = can_double(player_cards, is_split_hand)

    if soft:
        # Soft hands
        if pv >= 20:
            return "stand"
        if pv == 19:
            # H17: double vs 6 if allowed, else stand
            if dbl_ok and dealer_up_val == 6:
                return "double"
            return "stand"
        if pv == 18:
            if dealer_up_val >= 9:
                return "hit"
            if dbl_ok and 3 <= dealer_up_val <= 6:
                return "double"
            return "stand"
        if pv == 17:
            if dbl_ok and 3 <= dealer_up_val <= 6:
                return "double"
            return "hit"
        if pv in (16, 15):
            if dbl_ok and 4 <= dealer_up_val <= 6:
                return "double"
            return "hit"
        if pv in (14, 13):
            if dbl_ok and 5 <= dealer_up_val <= 6:
                return "double"
            return "hit"
        return "hit"
    else:
        # Hard hands
        if pv >= 17:
            return "stand"
        if pv >= 13 and dealer_up_val <= 6:
            return "stand"
        if pv == 12 and 4 <= dealer_up_val <= 6:
            return "stand"
        if pv == 11:
            if dbl_ok:
                return "double"
            return "hit"
        if pv == 10:
            if dbl_ok and dealer_up_val <= 9:
                return "double"
            return "hit"
        if pv == 9:
            if dbl_ok and 3 <= dealer_up_val <= 6:
                return "double"
            return "hit"
        return "hit"


# ─── SIMULATION ─────────────────────────────────────────────────────────────

def play_hand(player_cards, shoe, dealer_up_val, bet, is_split_hand=False, split_aces=False):
    """
    Play a single hand with basic strategy.
    Returns (total_wagered, cards) — wagered includes any double extra.
    """
    total_wagered = bet

    # Split aces locked — one card only, no further action
    if split_aces:
        return total_wagered, player_cards

    while True:
        if hand_value(player_cards) >= 21:
            break

        action = basic_strategy_action(player_cards, dealer_up_val, is_split_hand)

        if action == "stand":
            break
        elif action == "double":
            total_wagered += bet
            player_cards.append(shoe.draw())
            break
        elif action == "hit":
            player_cards.append(shoe.draw())
        else:
            break

    return total_wagered, player_cards


def resolve_vs_dealer(player_cards, dealer_val, wagered, is_split_hand=False):
    """Resolve a hand against dealer. Returns payout."""
    pv = hand_value(player_cards)

    if pv > 21:
        return 0  # bust

    # Natural blackjack only on non-split hands with 2 cards
    if not is_split_hand and len(player_cards) == 2 and pv == 21:
        # This is handled in the main loop before dealer plays
        pass

    if dealer_val > 21:
        return wagered * 2  # dealer bust
    if pv > dealer_val:
        return wagered * 2  # win
    if pv == dealer_val:
        return wagered      # push
    return 0                # lose


def simulate(num_rounds=2_000_000, bet=MONEY_SCALE):
    """
    Full simulation with splits, H17, no-DAS, no-resplit.
    """
    shoe = Shoe()
    total_wagered = 0
    total_returned = 0
    split_count = 0

    for _ in range(num_rounds):
        player_cards = [shoe.draw(), shoe.draw()]
        dealer_cards = [shoe.draw(), shoe.draw()]
        total_wagered += bet

        dealer_up_val = dealer_upcard_value(dealer_cards[0])

        # ── Check naturals ──
        pbj = is_blackjack(player_cards)
        dbj = is_blackjack(dealer_cards)

        if pbj and dbj:
            total_returned += bet  # push
            continue
        if pbj:
            total_returned += bet + int(bet * 1.5)  # 3:2
            continue
        if dbj:
            continue  # lose

        # ── Check for split ──
        hands_to_play = []  # list of (cards, extra_wager, is_split, split_aces)

        if should_split(player_cards, dealer_up_val):
            split_count += 1
            c1, c2 = player_cards
            splitting_aces = (c1.rank == "A" and c2.rank == "A")

            hand1_cards = [c1, shoe.draw()]
            hand2_cards = [c2, shoe.draw()]
            total_wagered += bet  # split costs extra bet

            hands_to_play.append((hand1_cards, bet, True, splitting_aces))
            hands_to_play.append((hand2_cards, bet, True, splitting_aces))
        else:
            hands_to_play.append((player_cards, bet, False, False))

        # ── Play all hands ──
        all_busted = True
        played_hands = []  # (wagered, cards, is_split)

        for (cards, hand_bet, is_split, split_aces) in hands_to_play:
            wagered, final_cards = play_hand(
                cards, shoe, dealer_up_val, hand_bet,
                is_split_hand=is_split, split_aces=split_aces
            )
            # Account for extra wagering from doubles
            extra = wagered - hand_bet
            if extra > 0:
                total_wagered += extra

            pv = hand_value(final_cards)
            if pv <= 21:
                all_busted = False
            played_hands.append((wagered, final_cards, is_split))

        # ── Dealer plays if any hand is still live ──
        if all_busted:
            continue

        dealer_cards = dealer_play(dealer_cards, shoe)
        dv = hand_value(dealer_cards)

        # ── Resolve all hands ──
        for (wagered, final_cards, is_split) in played_hands:
            payout = resolve_vs_dealer(final_cards, dv, wagered, is_split_hand=is_split)
            total_returned += payout

    rtp = total_returned / total_wagered * 100
    return rtp, total_wagered, total_returned, split_count


def main():
    num_rounds = 2_000_000
    if len(sys.argv) > 1:
        try:
            num_rounds = int(sys.argv[1])
        except ValueError:
            pass

    print("=" * 65)
    print("  Degen Blackjack — Full RTP Simulation (with Splits)")
    print("  Chad Labs / Stake Engine Approval Check")
    print("=" * 65)
    print(f"  Dealer rule:       H17 — dealer hits soft 17")
    print(f"  ALLOW_DAS:         {ALLOW_DAS}")
    print(f"  ALLOW_RESPLIT:     {ALLOW_RESPLIT}")
    print(f"  DOUBLE_HARD_9_11:  {DOUBLE_HARD_9_11}")
    print(f"  Decks:             6")
    print(f"  Hands:             {num_rounds:,}")
    print(f"  RTP Ceiling:       {RTP_CEILING:.1f}%")
    print("=" * 65)
    print()

    # Run with current config (hard 9-11 restriction)
    print(f"Running {num_rounds:,} hands (DOUBLE_HARD_9_11={DOUBLE_HARD_9_11})...")
    rtp, wagered, returned, splits = simulate(num_rounds)
    print()
    print(f"  Total Wagered:  ${wagered / MONEY_SCALE:>14,.2f}")
    print(f"  Total Returned: ${returned / MONEY_SCALE:>14,.2f}")
    print(f"  Simulated RTP:  {rtp:.4f}%")
    print(f"  Split Rounds:   {splits:,} ({splits/num_rounds*100:.2f}%)")
    print()

    if rtp < RTP_CEILING:
        margin = RTP_CEILING - rtp
        print(f"  RESULT: PASS — RTP {rtp:.4f}% is UNDER the {RTP_CEILING:.1f}% ceiling")
        print(f"          Safety margin: {margin:.4f}%")
    else:
        gap = rtp - RTP_CEILING
        print(f"  RESULT: FAIL — RTP {rtp:.4f}% exceeds ceiling by {gap:.4f}%")
        print(f"          Additional rule restrictions needed.")

    print("=" * 65)

    return 0 if rtp < RTP_CEILING else 1


if __name__ == "__main__":
    sys.exit(main())
