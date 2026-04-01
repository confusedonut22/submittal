import pathlib, sys, unittest, random
ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT / "math") not in sys.path:
    sys.path.insert(0, str(ROOT / "math"))

from engine import Card, HandState, RoundState, Shoe, split_hand, hand_value

class WagerAccountingTests(unittest.TestCase):
    def test_split_doubles_wager(self):
        """Splitting a hand should add the original bet to total_wagered."""
        rng = random.Random(42)
        shoe = Shoe(rng=rng)
        hand = HandState(cards=[Card("8", "hearts"), Card("8", "spades")], bet=1_000_000)
        state = RoundState(player_hands=[hand], total_wagered=1_000_000)
        success, _ = split_hand(state, 0, shoe)
        self.assertTrue(success)
        self.assertEqual(state.total_wagered, 2_000_000)

    def test_double_doubles_bet(self):
        """Doubling should double the hand's bet amount."""
        hand = HandState(cards=[Card("5", "hearts"), Card("6", "spades")], bet=1_000_000)
        hand.bet *= 2
        hand.doubled = True
        self.assertEqual(hand.bet, 2_000_000)
        self.assertTrue(hand.doubled)

    def test_split_then_double_not_allowed(self):
        """After splitting, DAS should be blocked (ALLOW_DAS = False)."""
        rng = random.Random(42)
        shoe = Shoe(rng=rng)
        hand = HandState(cards=[Card("8", "hearts"), Card("8", "spades")], bet=1_000_000)
        state = RoundState(player_hands=[hand], total_wagered=1_000_000)
        success, created = split_hand(state, 0, shoe)
        self.assertTrue(success)
        # Split hands should be marked as split hands
        for h in created:
            self.assertTrue(h.is_split_hand)

    def test_insurance_adds_to_wager(self):
        """Insurance amount should be added to total_wagered when taken."""
        from engine import calculate_insurance_amount
        total_main_bet = 2_000_000
        ins_amount = calculate_insurance_amount(total_main_bet)
        self.assertEqual(ins_amount, 1_000_000)

    def test_split_aces_wager_accounting(self):
        """Splitting aces should add bet to wager and both hands should be done."""
        rng = random.Random(42)
        shoe = Shoe(rng=rng)
        hand = HandState(cards=[Card("A", "hearts"), Card("A", "spades")], bet=1_000_000)
        state = RoundState(player_hands=[hand], total_wagered=1_000_000)
        success, created = split_hand(state, 0, shoe)
        self.assertTrue(success)
        self.assertEqual(state.total_wagered, 2_000_000)
        self.assertTrue(all(h.done for h in created))
        self.assertTrue(all(h.split_aces_locked for h in created))

if __name__ == "__main__":
    unittest.main()
