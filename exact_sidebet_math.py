"""
Exact six-deck side-bet probabilities and RTP for the currently implemented rules.

This module uses combinatorics over the finite 6-deck shoe, not Monte Carlo
simulation, so the resulting probabilities and RTP values are deterministic.
"""

from __future__ import annotations

from functools import lru_cache
from itertools import combinations_with_replacement
from math import comb
from typing import Dict, Iterable, Tuple

from engine import Card, evaluate_21_plus_3, evaluate_perfect_pairs

SUITS = ["diamonds", "hearts", "clubs", "spades"]
RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
DECKS = 6
TOTAL_CARDS = 52 * DECKS
TOTAL_PP_COMBINATIONS = comb(TOTAL_CARDS, 2)
TOTAL_213_COMBINATIONS = comb(TOTAL_CARDS, 3)
CARD_IDENTITIES: Tuple[Tuple[str, str], ...] = tuple((rank, suit) for suit in SUITS for rank in RANKS)


def _weight_for(index_combo: Iterable[int]) -> int:
    counts: Dict[int, int] = {}
    for index in index_combo:
        counts[index] = counts.get(index, 0) + 1
    weight = 1
    for copies in counts.values():
        weight *= comb(DECKS, copies)
    return weight


@lru_cache(maxsize=1)
def perfect_pairs_stats() -> Dict:
    categories = {
        "Perfect Pair": 0,
        "Coloured Pair": 0,
        "Mixed Pair": 0,
        "Lose": 0,
    }
    payout_total = 0

    for combo in combinations_with_replacement(range(len(CARD_IDENTITIES)), 2):
        weight = _weight_for(combo)
        cards = [Card(rank=CARD_IDENTITIES[i][0], suit=CARD_IDENTITIES[i][1]) for i in combo]
        result = evaluate_perfect_pairs(cards[0], cards[1], 1)
        if result.won:
            categories[result.name] += weight
            payout_total += result.payout * weight
        else:
            categories["Lose"] += weight

    probabilities = {name: count / TOTAL_PP_COMBINATIONS for name, count in categories.items()}
    return {
        "total_combinations": TOTAL_PP_COMBINATIONS,
        "categories": categories,
        "probabilities": probabilities,
        "rtp": payout_total / TOTAL_PP_COMBINATIONS,
    }


@lru_cache(maxsize=1)
def twenty_one_plus_three_stats() -> Dict:
    categories = {
        "Suited Trips": 0,
        "Straight Flush": 0,
        "Three of a Kind": 0,
        "Straight": 0,
        "Flush": 0,
        "Lose": 0,
    }
    payout_total = 0

    for combo in combinations_with_replacement(range(len(CARD_IDENTITIES)), 3):
        weight = _weight_for(combo)
        cards = [Card(rank=CARD_IDENTITIES[i][0], suit=CARD_IDENTITIES[i][1]) for i in combo]
        result = evaluate_21_plus_3(cards[0], cards[1], cards[2], 1)
        if result.won:
            categories[result.name] += weight
            payout_total += result.payout * weight
        else:
            categories["Lose"] += weight

    probabilities = {name: count / TOTAL_213_COMBINATIONS for name, count in categories.items()}
    return {
        "total_combinations": TOTAL_213_COMBINATIONS,
        "categories": categories,
        "probabilities": probabilities,
        "rtp": payout_total / TOTAL_213_COMBINATIONS,
    }
