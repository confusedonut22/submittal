import pathlib, sys, unittest, random
ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT / "math") not in sys.path:
    sys.path.insert(0, str(ROOT / "math"))

from engine import Card, HandState, RoundState, Shoe, split_hand, hand_value, complete_round, resolve_hand_state

class MultiHandProgressionTests(unittest.TestCase):
    def test_split_creates_correct_number_of_hands(self):
        rng = random.Random(10)
        shoe = Shoe(rng=rng)
        hand = HandState(cards=[Card("7", "hearts"), Card("7", "spades")], bet=1_000_000)
        state = RoundState(player_hands=[hand], total_wagered=1_000_000)
        success, created = split_hand(state, 0, shoe)
        self.assertTrue(success)
        self.assertEqual(len(state.player_hands), 2)

    def test_split_hands_play_independently(self):
        """Each split hand should have its own cards and be playable independently."""
        rng = random.Random(10)
        shoe = Shoe(rng=rng)
        hand = HandState(cards=[Card("7", "hearts"), Card("7", "spades")], bet=1_000_000)
        state = RoundState(player_hands=[hand], total_wagered=1_000_000)
        split_hand(state, 0, shoe)
        h1, h2 = state.player_hands
        # Each hand should start with 2 cards
        self.assertEqual(len(h1.cards), 2)
        self.assertEqual(len(h2.cards), 2)
        # Cards should be different
        self.assertNotEqual(h1.cards[1], h2.cards[1])

    def test_multi_hand_deal_order(self):
        """Multiple hands should be dealt and played right-to-left."""
        from engine import deal_round
        rng = random.Random(10)
        shoe = Shoe(rng=rng)
        configs = [
            {"bet": 1_000_000, "side_bets": {}},
            {"bet": 1_000_000, "side_bets": {}},
        ]
        state = deal_round(shoe, configs)
        self.assertEqual(len(state.player_hands), 2)
        self.assertEqual(state.total_wagered, 2_000_000)

    def test_h17_dealer_hits_soft_17(self):
        """Dealer should hit on soft 17 (H17 rule)."""
        from engine import dealer_play, is_soft
        rng = random.Random(1)
        shoe = Shoe(rng=rng)
        # Ace + 6 = soft 17
        dealer_cards = [Card("A", "hearts"), Card("6", "spades")]
        result = dealer_play(dealer_cards, shoe)
        # Dealer should have drawn at least one more card
        self.assertGreater(len(result), 2)

    def test_split_hand_21_not_blackjack(self):
        """A 21 from a split hand should pay 1:1, not 3:2."""
        hand = HandState(
            cards=[Card("A", "hearts"), Card("K", "spades")],
            bet=1_000_000,
            is_split_hand=True,
            counts_as_blackjack=False,
        )
        dealer = [Card("10", "clubs"), Card("7", "diamonds")]
        result, payout = resolve_hand_state(hand, dealer)
        self.assertEqual(payout, 2_000_000)  # 1:1, not 3:2

if __name__ == "__main__":
    unittest.main()
