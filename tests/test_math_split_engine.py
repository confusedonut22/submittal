import pathlib
import sys
import unittest
import random

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT / "math") not in sys.path:
    sys.path.insert(0, str(ROOT / "math"))

from engine import Card, HandResult, HandState, RoundState, Shoe, can_split_hand, split_hand, resolve_hand_state


class MathSplitEngineTests(unittest.TestCase):
    def test_can_split_pair(self):
        hand = HandState(cards=[Card("8", "hearts"), Card("8", "spades")], bet=1_000_000)
        self.assertTrue(can_split_hand(hand))

    def test_split_hand_creates_two_children_and_increases_wager(self):
        rng = random.Random(1)
        shoe = Shoe(rng=rng)
        state = RoundState(player_hands=[HandState(cards=[Card("8", "hearts"), Card("8", "spades")], bet=1_000_000)], total_wagered=1_000_000)
        success, created = split_hand(state, 0, shoe)
        self.assertTrue(success)
        self.assertEqual(len(created), 2)
        self.assertEqual(len(state.player_hands), 2)
        self.assertEqual(state.total_wagered, 2_000_000)
        self.assertTrue(all(hand.is_split_hand for hand in created))

    def test_split_21_is_not_blackjack(self):
        hand = HandState(
            cards=[Card("A", "hearts"), Card("K", "spades")],
            bet=1_000_000,
            is_split_hand=True,
            counts_as_blackjack=False,
        )
        dealer = [Card("10", "clubs"), Card("7", "diamonds")]
        result, payout = resolve_hand_state(hand, dealer)
        self.assertEqual(result, HandResult.WIN)
        self.assertEqual(payout, 2_000_000)

    def test_split_aces_lock_after_split(self):
        rng = random.Random(2)
        shoe = Shoe(rng=rng)
        state = RoundState(player_hands=[HandState(cards=[Card("A", "hearts"), Card("A", "spades")], bet=1_000_000)], total_wagered=1_000_000)
        success, created = split_hand(state, 0, shoe)
        self.assertTrue(success)
        self.assertTrue(all(hand.split_aces_locked for hand in created))
        self.assertTrue(all(hand.done for hand in created))


if __name__ == "__main__":
    unittest.main()
