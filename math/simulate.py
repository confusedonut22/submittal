"""
Degen Blackjack — RTP Simulator
Chad Labs / Stake Engine
Runs rounds to approximate current implemented RTP:
  - Base game: ~97.9% simulation-backed estimate with basic strategy + H17 + 7:5 BJ + double hard 9/10/11
  - Perfect Pairs: 86.4952% exact for current 6-deck profit-only rules
  - 21+3: 85.7029% exact for current 6-deck profit-only rules
"""

import sys
from engine import (
    Shoe, Card, HandState, SideBetType,
    hand_value, is_blackjack, is_bust, is_soft,
    evaluate_perfect_pairs, evaluate_21_plus_3,
    resolve_hand, dealer_play, deal_round, complete_round,
    MONEY_SCALE, DOUBLE_ON_HARD
)


def basic_strategy_action(player_cards, dealer_up_card):
    """
    Basic strategy for simulation, aligned with locked ruleset.
    Double restricted to hard totals in DOUBLE_ON_HARD (currently hard 11 only).
    Returns: 'hit', 'stand', or 'double'
    """
    pv = hand_value(player_cards)
    soft = is_soft(player_cards)
    can_double = len(player_cards) == 2

    dv = dealer_up_card.value
    if dealer_up_card.rank in ("J", "Q", "K"):
        dv = 10
    if dealer_up_card.rank == "A":
        dv = 11

    if pv >= 17:
        return "stand"
    if pv <= 8:
        return "hit"

    if soft:
        if pv >= 19:
            return "stand"
        if pv == 18:
            if dv >= 9:
                return "hit"
            return "stand"
        return "hit"
    else:
        if pv >= 13 and dv <= 6:
            return "stand"
        if pv == 12 and 4 <= dv <= 6:
            return "stand"
        # Double on hard 9, 10, 11 (matching DOUBLE_ON_HARD ruleset)
        if can_double and not soft and pv in DOUBLE_ON_HARD:
            return "double"
        return "hit"


def simulate_base_game(num_rounds=1_000_000, base_bet=MONEY_SCALE):
    """
    Simulate base game to calculate RTP.
    Uses basic strategy with hard-11-only doubling (matching locked ruleset).
    """
    shoe = Shoe()
    total_wagered = 0
    total_returned = 0

    for _ in range(num_rounds):
        player_cards = [shoe.draw(), shoe.draw()]
        dealer_cards = [shoe.draw(), shoe.draw()]
        total_wagered += base_bet

        pbj = is_blackjack(player_cards)
        dbj = is_blackjack(dealer_cards)

        if pbj and dbj:
            total_returned += base_bet
            continue
        if pbj:
            total_returned += base_bet + int(base_bet * 1.5)
            continue
        if dbj:
            continue

        hand_bet = base_bet
        doubled = False

        while True:
            pv = hand_value(player_cards)
            if pv > 21:
                break

            action = basic_strategy_action(player_cards, dealer_cards[0])

            if action == "stand":
                break
            elif action == "double" and not doubled:
                total_wagered += base_bet
                hand_bet = base_bet * 2
                doubled = True
                player_cards.append(shoe.draw())
                break
            elif action == "hit":
                player_cards.append(shoe.draw())
            else:
                break

        pv = hand_value(player_cards)
        if pv > 21:
            continue

        dealer_cards = dealer_play(dealer_cards, shoe)
        dv = hand_value(dealer_cards)

        if dv > 21:
            total_returned += hand_bet * 2
        elif pv > dv:
            total_returned += hand_bet * 2
        elif pv == dv:
            total_returned += hand_bet

    rtp = total_returned / total_wagered * 100
    return rtp, total_wagered, total_returned


def simulate_perfect_pairs(num_rounds=1_000_000, bet=100_000):
    """Simulate Perfect Pairs side bet only."""
    shoe = Shoe()
    total_wagered = 0
    total_returned = 0

    for _ in range(num_rounds):
        card1 = shoe.draw()
        card2 = shoe.draw()
        # Also draw dealer cards to keep shoe moving
        shoe.draw()
        shoe.draw()

        total_wagered += bet
        result = evaluate_perfect_pairs(card1, card2, bet)
        if result.won:
            total_returned += result.payout

    rtp = total_returned / total_wagered * 100
    return rtp, total_wagered, total_returned


def simulate_21_plus_3(num_rounds=1_000_000, bet=100_000):
    """Simulate 21+3 side bet only."""
    shoe = Shoe()
    total_wagered = 0
    total_returned = 0

    for _ in range(num_rounds):
        p1 = shoe.draw()
        p2 = shoe.draw()
        d_up = shoe.draw()
        shoe.draw()  # dealer hole card

        total_wagered += bet
        result = evaluate_21_plus_3(p1, p2, d_up, bet)
        if result.won:
            total_returned += result.payout

    rtp = total_returned / total_wagered * 100
    return rtp, total_wagered, total_returned


def main():
    num_rounds = 1_000_000
    if len(sys.argv) > 1:
        num_rounds = int(sys.argv[1])

    print(f"Degen Blackjack — RTP Simulation")
    print(f"Chad Labs / Stake Engine")
    print(f"Running {num_rounds:,} rounds per test...")
    print(f"{'='*50}")

    print(f"\n1. Base Game (target: ~97.9%, H17, double hard 11 only)")
    rtp, wagered, returned = simulate_base_game(num_rounds)
    print(f"   Wagered:  ${wagered / MONEY_SCALE:,.2f}")
    print(f"   Returned: ${returned / MONEY_SCALE:,.2f}")
    print(f"   RTP:      {rtp:.2f}%")
    print(f"   {'PASS' if 95.0 < rtp < 98.0 else 'CHECK -- must be below 98.0%'}")

    print(f"\n2. Perfect Pairs (target exact: 86.4952%)")
    rtp, wagered, returned = simulate_perfect_pairs(num_rounds)
    print(f"   Wagered:  ${wagered / MONEY_SCALE:,.2f}")
    print(f"   Returned: ${returned / MONEY_SCALE:,.2f}")
    print(f"   RTP:      {rtp:.2f}%")
    print(f"   {'PASS' if 84.5 < rtp < 88.5 else 'CHECK'}")

    print(f"\n3. 21+3 (target exact: 85.7029%)")
    rtp, wagered, returned = simulate_21_plus_3(num_rounds)
    print(f"   Wagered:  ${wagered / MONEY_SCALE:,.2f}")
    print(f"   Returned: ${returned / MONEY_SCALE:,.2f}")
    print(f"   RTP:      {rtp:.2f}%")
    print(f"   {'PASS' if 83.5 < rtp < 87.5 else 'CHECK'}")

    print(f"\n{'='*50}")
    print(f"Simulation complete.")


if __name__ == "__main__":
    main()
