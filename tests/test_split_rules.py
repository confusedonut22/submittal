import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
GAME_SRC = ROOT / "game" / "src" / "game"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class SplitRuleChecklistTests(unittest.TestCase):
    def test_task_board_exists(self):
        self.assertTrue((ROOT / "SUBMISSION_TASKS.md").exists())

    def test_frontend_engine_has_split_helpers(self):
        text = (GAME_SRC / "engine.js").read_text(encoding="utf-8")
        self.assertIn("export function canSplitHand", text)
        self.assertIn("export function splitHandAtIndex", text)
        self.assertIn("countsAsBlackjack", text)

    def test_frontend_store_exposes_split_action(self):
        text = (GAME_SRC / "store.js").read_text(encoding="utf-8")
        self.assertIn("export function split()", text)
        self.assertIn('action: "split"', text)

    def test_ui_no_longer_claims_split_unavailable(self):
        text = (ROOT / "game" / "src" / "ui" / "GameTable.svelte").read_text(encoding="utf-8")
        self.assertNotIn("Split is not available in the current build.", text)
        self.assertIn(">Split<", text)


if __name__ == "__main__":
    unittest.main()
