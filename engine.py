"""
Degen Blackjack — Math Engine
Chad Labs / Stake Engine RGS
Handles: shoe management, dealing, hand evaluation, side bets, payouts
"""

import random
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

# ─── CONSTANTS ───

SUITS = ["diamonds", "hearts", "clubs", "spades"]
RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
RED_SUITS = {"diamonds", "hearts"}
NUM_DECKS = 6
RESHUFFLE_THRESHOLD = 52  # reshuffle when fewer than this many cards remain
BJ_MULTIPLIER = 1.5  # 3:2 payout

# Stake Engine money format: integers with 6 decimal places
# 1_000_000 = $1.00
MONEY_SCALE = 1_000_000


def calculate_insurance_amount(total_main_bet: int) -> int:
    """Insurance is capped at half of the total main wager."""
    return total_main_bet // 2


class HandResult(Enum):
    WIN = "win"
    LOSE = "lose"
    PUSH = "push"
    BLACKJACK = "blackjack"
    BUST = "bust"


class SideBetType(Enum):
    PERFECT_PAIRS = "perfect_pairs"
    TWENTY_ONE_PLUS_THREE = "21+3"


# ─── CARD & SHOE ───

@dataclass
class Card:
    rank: str
    suit: str

    @property
    def value(self) -> int:
        if self.rank == "A":
            return 11
        elif self.rank in ("J", "Q", "K"):
            return 10
        return int(self.rank)

    @property
    def is_red(self) -> bool:
        return self.suit in RED_SUITS

    def __repr__(self):
        symbols = {"diamonds": "♦", "hearts": "♥", "clubs": "♣", "spades": "♠"}
        return f"{self.rank}{symbols.get(self.suit, '?')}"


class Shoe:
    def __init__(self, num_decks: int = NUM_DECKS, rng: Optional[random.Random] = None):
        self.num_decks = num_decks
        self.rng = rng or random.Random()
        self.cards: List[Card] = []
        self.shuffle()

    def shuffle(self):
        self.cards = []
        for _ in range(self.num_decks):
            for suit in SUITS:
                for rank in RANKS:
                    self.cards.append(Card(rank=rank, suit=suit))
        self.rng.shuffle(self.cards)

    def draw(self) -> Card:
        if len(self.cards) < RESHUFFLE_THRESHOLD:
            self.shuffle()
        return self.cards.pop()

    @property
    def remaining(self) -> int:
        return len(self.cards)


# ─── HAND EVALUATION ───

def hand_value(cards: List[Card]) -> int:
    """Calculate best hand value, treating Aces as 11 or 1."""
    value = sum(c.value for c in cards)
    aces = sum(1 for c in cards if c.rank == "A")
    while value > 21 and aces > 0:
        value -= 10
        aces -= 1
    return value


def is_soft(cards: List[Card]) -> bool:
    """Check if hand is soft (has an Ace counted as 11)."""
    value = sum(c.value for c in cards)
    aces = sum(1 for c in cards if c.rank == "A")
    while value > 21 and aces > 0:
        value -= 10
        aces -= 1
    return aces > 0


def is_blackjack(cards: List[Card]) -> bool:
    """Check for natural blackjack (2 cards, value 21)."""
    return len(cards) == 2 and hand_value(cards) == 21


def is_bust(cards: List[Card]) -> bool:
    return hand_value(cards) > 21


# ─── SIDE BET EVALUATION ───
# Payouts match Stake.com live blackjack exactly

@dataclass
class SideBetResult:
    bet_type: SideBetType
    won: bool
    name: str = ""
    multiplier: int = 0
    payout: int = 0  # in Stake Engine money format


def evaluate_perfect_pairs(card1: Card, card2: Card, bet_amount: int) -> SideBetResult:
    """
    Perfect Pairs side bet (current 6-deck exact RTP: 86.4952%)
    - Perfect Pair (same rank, same suit): 25:1
    - Coloured Pair (same rank, same color): 12:1
    - Mixed Pair (same rank, different color): 6:1
    """
    if card1.rank != card2.rank:
        return SideBetResult(
            bet_type=SideBetType.PERFECT_PAIRS,
            won=False
        )

    if card1.suit == card2.suit:
        mult = 25
        name = "Perfect Pair"
    elif card1.is_red == card2.is_red:
        mult = 12
        name = "Coloured Pair"
    else:
        mult = 6
        name = "Mixed Pair"

    return SideBetResult(
        bet_type=SideBetType.PERFECT_PAIRS,
        won=True,
        name=name,
        multiplier=mult,
        payout=bet_amount * mult
    )


def evaluate_21_plus_3(player1: Card, player2: Card, dealer_up: Card, bet_amount: int) -> SideBetResult:
    """
    21+3 side bet (current 6-deck exact RTP: 85.7029%)
    Uses player's first 2 cards + dealer's up card
    - Suited Trips: 100:1
    - Straight Flush: 40:1
    - Three of a Kind: 30:1
    - Straight: 10:1
    - Flush: 5:1
    """
    cards = [player1, player2, dealer_up]
    ranks = sorted([RANKS.index(c.rank) for c in cards])
    suits = [c.suit for c in cards]

    all_same_suit = suits[0] == suits[1] == suits[2]
    all_same_rank = cards[0].rank == cards[1].rank == cards[2].rank
    rank_set = {card.rank for card in cards}
    is_sequential = (ranks[2] - ranks[1] == 1 and ranks[1] - ranks[0] == 1) or rank_set == {"A", "2", "3"} or rank_set == {"Q", "K", "A"}

    if all_same_rank and all_same_suit:
        return SideBetResult(SideBetType.TWENTY_ONE_PLUS_THREE, True, "Suited Trips", 100, bet_amount * 100)
    elif is_sequential and all_same_suit:
        return SideBetResult(SideBetType.TWENTY_ONE_PLUS_THREE, True, "Straight Flush", 40, bet_amount * 40)
    elif all_same_rank:
        return SideBetResult(SideBetType.TWENTY_ONE_PLUS_THREE, True, "Three of a Kind", 30, bet_amount * 30)
    elif is_sequential:
        return SideBetResult(SideBetType.TWENTY_ONE_PLUS_THREE, True, "Straight", 10, bet_amount * 10)
    elif all_same_suit:
        return SideBetResult(SideBetType.TWENTY_ONE_PLUS_THREE, True, "Flush", 5, bet_amount * 5)
    else:
        return SideBetResult(SideBetType.TWENTY_ONE_PLUS_THREE, False)


# ─── MAIN HAND RESOLUTION ───

def resolve_hand(player_cards: List[Card], dealer_cards: List[Card], bet_amount: int) -> Tuple[HandResult, int]:
    """
    Resolve a single hand against the dealer.
    Returns (result, payout_amount) where payout includes original bet.
    
    Main game payouts (true, no scaling):
    - Win: bet × 2 (1:1)
    - Blackjack: bet + floor(bet × 1.5) (3:2)
    - Push: bet returned
    - Lose: 0
    """
    player_val = hand_value(player_cards)
    dealer_val = hand_value(dealer_cards)
    player_bj = is_blackjack(player_cards)
    dealer_bj = is_blackjack(dealer_cards)

    # Both blackjack = push
    if player_bj and dealer_bj:
        return HandResult.PUSH, bet_amount

    # Player blackjack
    if player_bj:
        payout = bet_amount + int(bet_amount * BJ_MULTIPLIER)
        return HandResult.BLACKJACK, payout

    # Dealer blackjack
    if dealer_bj:
        return HandResult.LOSE, 0

    # Player bust
    if player_val > 21:
        return HandResult.BUST, 0

    # Dealer bust
    if dealer_val > 21:
        return HandResult.WIN, bet_amount * 2

    # Compare values
    if player_val > dealer_val:
        return HandResult.WIN, bet_amount * 2
    elif player_val == dealer_val:
        return HandResult.PUSH, bet_amount
    else:
        return HandResult.LOSE, 0


def dealer_play(dealer_cards: List[Card], shoe: Shoe) -> List[Card]:
    """Dealer draws until reaching 17 or higher. Stands on all 17s."""
    cards = list(dealer_cards)
    while hand_value(cards) < 17:
        cards.append(shoe.draw())
    return cards


# ─── INSURANCE ───

def evaluate_insurance(dealer_cards: List[Card], insurance_amount: int) -> Tuple[bool, int]:
    """
    Insurance pays 2:1 if dealer has blackjack.
    Only offered when dealer's up card is an Ace.
    Returns (dealer_has_bj, payout) where payout includes the original stake.
    """
    if is_blackjack(dealer_cards):
        return True, insurance_amount * 3
    return False, 0


# ─── GAME ROUND ───

@dataclass
class HandState:
    cards: List[Card] = field(default_factory=list)
    bet: int = 0
    side_bets: dict = field(default_factory=dict)  # {SideBetType: amount}
    result: Optional[HandResult] = None
    payout: int = 0
    side_bet_results: List[SideBetResult] = field(default_factory=list)
    doubled: bool = False


@dataclass
class RoundState:
    dealer_cards: List[Card] = field(default_factory=list)
    player_hands: List[HandState] = field(default_factory=list)
    insurance_offered: bool = False
    insurance_taken: bool = False
    insurance_amount: int = 0
    total_wagered: int = 0
    total_returned: int = 0


def deal_round(shoe: Shoe, hand_configs: List[dict]) -> RoundState:
    """
    Deal a new round.
    hand_configs: list of {"bet": int, "side_bets": {SideBetType: int}}
    """
    state = RoundState()

    # Deal dealer cards
    state.dealer_cards = [shoe.draw(), shoe.draw()]

    # Deal player hands
    for config in hand_configs:
        hand = HandState(
            cards=[shoe.draw(), shoe.draw()],
            bet=config["bet"],
            side_bets=config.get("side_bets", {})
        )
        state.player_hands.append(hand)

    # Calculate total wagered
    for hand in state.player_hands:
        state.total_wagered += hand.bet
        for sb_amount in hand.side_bets.values():
            state.total_wagered += sb_amount

    # Check if insurance should be offered
    if state.dealer_cards[0].rank == "A":
        state.insurance_offered = True
        state.insurance_amount = calculate_insurance_amount(
            sum(hand.bet for hand in state.player_hands)
        )

    # Evaluate side bets immediately
    dealer_bj = is_blackjack(state.dealer_cards)
    for hand in state.player_hands:
        if SideBetType.PERFECT_PAIRS in hand.side_bets:
            result = evaluate_perfect_pairs(
                hand.cards[0], hand.cards[1],
                hand.side_bets[SideBetType.PERFECT_PAIRS]
            )
            hand.side_bet_results.append(result)

        if SideBetType.TWENTY_ONE_PLUS_THREE in hand.side_bets:
            result = evaluate_21_plus_3(
                hand.cards[0], hand.cards[1], state.dealer_cards[0],
                hand.side_bets[SideBetType.TWENTY_ONE_PLUS_THREE]
            )
            hand.side_bet_results.append(result)

    return state


def complete_round(state: RoundState, shoe: Shoe) -> RoundState:
    """
    Complete a round after all player actions are done.
    Dealer plays, then resolve all hands.
    """
    # Dealer plays
    state.dealer_cards = dealer_play(state.dealer_cards, shoe)

    # Resolve each hand
    for hand in state.player_hands:
        if hand.result is None:  # Not already resolved (BJ/bust during play)
            hand.result, hand.payout = resolve_hand(
                hand.cards, state.dealer_cards, hand.bet
            )

    # Calculate total returned
    for hand in state.player_hands:
        state.total_returned += hand.payout
        for sb_result in hand.side_bet_results:
            if sb_result.won:
                state.total_returned += sb_result.payout

    # Insurance
    if state.insurance_taken:
        state.total_wagered += state.insurance_amount
        _, ins_payout = evaluate_insurance(state.dealer_cards, state.insurance_amount)
        state.total_returned += ins_payout

    return state


if __name__ == "__main__":
    # Quick test
    shoe = Shoe()
    config = [
        {"bet": 1_000_000, "side_bets": {SideBetType.PERFECT_PAIRS: 100_000}},
    ]
    state = deal_round(shoe, config)
    print(f"Dealer: {state.dealer_cards}")
    for i, hand in enumerate(state.player_hands):
        print(f"Hand {i}: {hand.cards} = {hand_value(hand.cards)}")
        for sb in hand.side_bet_results:
            print(f"  Side bet: {sb.bet_type.value} - {'WON' if sb.won else 'LOST'} {sb.name} {sb.multiplier}x")

    state = complete_round(state, shoe)
    print(f"Dealer final: {state.dealer_cards} = {hand_value(state.dealer_cards)}")
    for i, hand in enumerate(state.player_hands):
        print(f"Hand {i} result: {hand.result.value} - payout: ${hand.payout / MONEY_SCALE:.2f}")
    print(f"Total wagered: ${state.total_wagered / MONEY_SCALE:.2f}")
    print(f"Total returned: ${state.total_returned / MONEY_SCALE:.2f}")
