"""
Degen Blackjack — RTP Simulator
Chad Labs / Stake Engine
Runs rounds to approximate current implemented RTP:
  - Base game: ~98.7% simulation-backed estimate with basic strategy
  - Perfect Pairs: 86.4952% exact for current 6-deck profit-only rules
  - 21+3: 85.7029% exact for current 6-deck profit-only rules
"""

import sys
from engine import (
    Shoe, Card, HandState, SideBetType,
    hand_value, is_blackjack, is_bust, is_soft,
    evaluate_perfect_pairs, evaluate_21_plus_3,
    resolve_hand, dealer_play, deal_round, complete_round,
    MONEY_SCALE
)


def basic_strategy_action(player_cards, dealer_up_card):
    """
    Simple basic strategy for simulation.
    Returns: 'hit', 'stand', or 'double'
    """
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
            if dv >= 9:
                return "hit"
            return "stand"
        return "hit"
    else:
        if pv >= 17:
            return "stand"
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


def simulate_base_game(num_rounds=1_000_000, bet=MONEY_SCALE):
    """Simulate base game only to calculate RTP."""
    shoe = Shoe()
    total_wagered = 0
    total_returned = 0

    for _ in range(num_rounds):
        # Deal
        player_cards = [shoe.draw(), shoe.draw()]
        dealer_cards = [shoe.draw(), shoe.draw()]
        total_wagered += bet

        # Check naturals
        pbj = is_blackjack(player_cards)
        dbj = is_blackjack(dealer_cards)

        if pbj and dbj:
            total_returned += bet  # push
            continue
        if pbj:
            total_returned += bet + int(bet * 1.5)
            continue
        if dbj:
            continue  # lose

        # Player plays basic strategy
        while True:
            action = basic_strategy_action(player_cards, dealer_cards[0])
            if action == "stand":
                break
            elif action == "double":
                total_wagered += bet  # additional bet
                player_cards.append(shoe.draw())
                bet_this_hand = bet * 2
                break
            elif action == "hit":
                player_cards.append(shoe.draw())
                if hand_value(player_cards) > 21:
                    break
                bet_this_hand = bet
            else:
                break
        else:
            bet_this_hand = bet

        if action != "double":
            bet_this_hand = bet

        pv = hand_value(player_cards)
        if pv > 21:
            if action == "double":
                pass  # already counted the extra wager
            continue

        # Dealer plays
        while hand_value(dealer_cards) < 17:
            dealer_cards.append(shoe.draw())

        dv = hand_value(dealer_cards)

        if dv > 21:
            total_returned += bet_this_hand * 2
        elif pv > dv:
            total_returned += bet_this_hand * 2
        elif pv == dv:
            total_returned += bet_this_hand

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

    print(f"\n1. Base Game (current estimate: 98.7%)")
    rtp, wagered, returned = simulate_base_game(num_rounds)
    print(f"   Wagered:  ${wagered / MONEY_SCALE:,.2f}")
    print(f"   Returned: ${returned / MONEY_SCALE:,.2f}")
    print(f"   RTP:      {rtp:.2f}%")
    print(f"   {'PASS' if 98.5 < rtp < 100.0 else 'CHECK'}")

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
