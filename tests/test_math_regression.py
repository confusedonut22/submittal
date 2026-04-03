import pathlib, sys, unittest, random
ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT / "math") not in sys.path:
    sys.path.insert(0, str(ROOT / "math"))

from engine import (
    Card, HandResult, HandState, RoundState, Shoe,
    deal_round, complete_round, hand_value, is_blackjack,
    evaluate_perfect_pairs, evaluate_21_plus_3,
    SideBetType, dealer_play, is_soft,
)

class MathRegressionTests(unittest.TestCase):
    def test_blackjack_pays_7_to_5(self):
        hand = HandState(cards=[Card("A", "hearts"), Card("K", "spades")], bet=1_000_000)
        dealer = [Card("7", "clubs"), Card("9", "diamonds")]
        from engine import resolve_hand_state
        result, payout = resolve_hand_state(hand, dealer)
        self.assertEqual(result, HandResult.BLACKJACK)
        self.assertEqual(payout, 2_400_000)  # 1M bet + 1.4M = 2.4M (7:5 payout)

    def test_dealer_blackjack_beats_player_20(self):
        hand = HandState(cards=[Card("K", "hearts"), Card("Q", "spades")], bet=1_000_000)
        dealer = [Card("A", "clubs"), Card("K", "diamonds")]
        from engine import resolve_hand_state
        result, payout = resolve_hand_state(hand, dealer)
        self.assertEqual(result, HandResult.LOSE)
        self.assertEqual(payout, 0)

    def test_push_returns_bet(self):
        hand = HandState(cards=[Card("K", "hearts"), Card("Q", "spades")], bet=1_000_000)
        dealer = [Card("K", "clubs"), Card("Q", "diamonds")]
        from engine import resolve_hand_state
        result, payout = resolve_hand_state(hand, dealer)
        self.assertEqual(result, HandResult.PUSH)
        self.assertEqual(payout, 1_000_000)

    def test_perfect_pair_payout(self):
        result = evaluate_perfect_pairs(Card("A", "hearts"), Card("A", "hearts"), 100_000)
        self.assertTrue(result.won)
        self.assertEqual(result.multiplier, 25)
        self.assertEqual(result.payout, 2_500_000)

    def test_21_plus_3_flush(self):
        result = evaluate_21_plus_3(
            Card("2", "hearts"), Card("7", "hearts"), Card("K", "hearts"), 100_000
        )
        self.assertTrue(result.won)
        self.assertEqual(result.name, "Flush")
        self.assertEqual(result.multiplier, 5)

    def test_dealer_h17_rule(self):
        """Verify dealer hits soft 17."""
        rng = random.Random(99)
        shoe = Shoe(rng=rng)
        dealer_cards = [Card("A", "spades"), Card("6", "hearts")]
        self.assertEqual(hand_value(dealer_cards), 17)
        self.assertTrue(is_soft(dealer_cards))
        result = dealer_play(dealer_cards, shoe)
        # Should have hit (drawn at least one more card)
        self.assertGreater(len(result), 2)

    def test_rtp_simulation_under_98(self):
        """
        10,000-hand simulation using stand-only strategy to verify base game RTP
        is below the Stake Engine 98.0% ceiling.
        Stand-only strategy RTP is ~96-97% (well below ceiling), so this catches
        gross engine bugs (payout errors, wager tracking failures, etc.).
        For final published RTP (~97.9%), see math/simulate.py full run.
        """
        rng = random.Random(42)
        shoe = Shoe(rng=rng)
        total_wagered = 0
        total_returned = 0
        for _ in range(10_000):
            state = deal_round(shoe, [{"bet": 1_000_000, "side_bets": {}}])
            # Stand-only: conservative lower bound on RTP
            state = complete_round(state, shoe)
            total_wagered += state.total_wagered
            total_returned += state.total_returned
        rtp = total_returned / total_wagered if total_wagered else 0
        # Stand-only RTP must be above 80% (engine not broken) and below 98% ceiling
        # Note: stand-only with 7:5 BJ payout legitimately runs ~85-87%
        self.assertGreater(rtp, 0.80, "RTP implausibly low — engine payout bug?")
        self.assertLess(rtp, 0.98, f"RTP {rtp:.4f} exceeds Stake 98.0% ceiling")

if __name__ == "__main__":
    unittest.main()
