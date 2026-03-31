import json
import os
import threading
import time
import tempfile
import unittest
import urllib.request

from backend_config import load_backend_config
from authoritative_blackjack import MockBlackjackService
from mock_rgs_server import run_server


class MockRGSServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tempdir = tempfile.TemporaryDirectory()
        cls.server = run_server(
            "127.0.0.1",
            8788,
            storage_path=os.path.join(cls.tempdir.name, "server_state.json"),
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.05)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=1)
        cls.tempdir.cleanup()

    def post(self, path, payload):
        req = urllib.request.Request(
            f"http://127.0.0.1:8788{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"content-type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))

    def get(self, path):
        with urllib.request.urlopen(f"http://127.0.0.1:8788{path}") as response:
            return json.loads(response.read().decode("utf-8"))

    def test_health_endpoint_reports_service_status(self):
        health = self.get("/health")
        self.assertEqual(health["ok"], True)
        self.assertEqual(health["service"], "mock-rgs")
        self.assertIn("storagePath", health)

    def test_authoritative_round_lifecycle(self):
        session_id = "test-session"
        auth = self.post("/wallet/authenticate", {"sessionID": session_id})
        self.assertIsNone(auth["round"])
        self.assertEqual(auth["balance"]["amount"], 1_000_000_000)

        balance_before = self.post("/wallet/balance", {"sessionID": session_id})
        self.assertEqual(balance_before["balance"]["amount"], 1_000_000_000)

        play = self.post("/wallet/play", {
            "sessionID": session_id,
            "amount": 1_100_000,
            "mode": "BASE",
            "handConfigs": [{
                "bet": 1_000_000,
                "sideBets": {"pp": 100_000, "t": 0},
            }],
        })
        self.assertTrue(play["round"]["active"])
        self.assertIn("state", play["round"])
        self.assertEqual(play["balance"]["amount"], 998_900_000)

        balance_during = self.post("/wallet/balance", {"sessionID": session_id})
        self.assertEqual(balance_during["balance"]["amount"], 998_900_000)

        state = play["round"]["state"]
        if state["phase"] == "INS":
            event = self.post("/bet/event", {
                "sessionID": session_id,
                "event": json.dumps({
                    "sequence": 1,
                    "event": {"type": "insuranceDecision", "accepted": False},
                }),
            })
            state = json.loads(event["event"])["state"]

        if state["phase"] == "PLAY":
            event = self.post("/bet/event", {
                "sessionID": session_id,
                "event": json.dumps({
                    "sequence": 2,
                    "event": {"type": "playerAction", "action": "stand", "handIndex": 0},
                }),
            })
            parsed = json.loads(event["event"])
            state = parsed["state"]
            self.assertIn("phase", state)

        if state["phase"] == "RESULT":
            end_round = self.post("/wallet/end-round", {"sessionID": session_id})
            self.assertIn("balance", end_round)
            replay = self.post("/replay/event", {"sessionID": session_id, "event": str(play["round"]["betID"])})
            self.assertEqual(replay["event"], str(play["round"]["betID"]))
            self.assertIn("round", replay)

        follow_up = self.post("/wallet/authenticate", {"sessionID": session_id})
        self.assertIn("balance", follow_up)

    def test_service_persists_sessions_and_replay_history(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage_path = os.path.join(tmpdir, "mock_rgs_state.json")
            service = MockBlackjackService(seed=42, storage_path=storage_path)
            play = service.play(
                session_id="persisted-session",
                amount=1_000_000,
                mode="BASE",
                hand_configs=[{"bet": 1_000_000, "sideBets": {"pp": 0, "t": 0}}],
            )
            round_payload = play["round"]
            if round_payload["state"]["phase"] == "INS":
                service.event("persisted-session", json.dumps({
                    "sequence": 1,
                    "event": {"type": "insuranceDecision", "accepted": False},
                }))
            if service.get_session("persisted-session").round.phase == "PLAY":
                service.event("persisted-session", json.dumps({
                    "sequence": 2,
                    "event": {"type": "playerAction", "action": "stand", "handIndex": 0},
                }))
            service.end_round("persisted-session")

            restored = MockBlackjackService(seed=42, storage_path=storage_path)
            replay = restored.replay("persisted-session", str(round_payload["betID"]))
            self.assertEqual(replay["event"], str(round_payload["betID"]))
            self.assertIn("round", replay)

    def test_service_rejects_event_for_wrong_bet_id(self):
        service = MockBlackjackService(seed=42)
        play = service.play(
            session_id="bad-event-session",
            amount=1_000_000,
            mode="BASE",
            hand_configs=[{"bet": 1_000_000, "sideBets": {"pp": 0, "t": 0}}],
        )
        with self.assertRaisesRegex(ValueError, "betID does not match"):
            service.event("bad-event-session", json.dumps({
                "schemaVersion": 1,
                "betID": play["round"]["betID"] + 1,
                "mode": "BASE",
                "sequence": 1,
                "event": {"type": "playerAction", "action": "stand", "handIndex": 0},
                "state": play["round"]["state"],
            }))

    def test_service_rejects_mismatched_play_amount(self):
        service = MockBlackjackService(seed=42)
        with self.assertRaisesRegex(ValueError, "Declared amount does not match"):
            service.play(
                session_id="bad-play-session",
                amount=2_000_000,
                mode="BASE",
                hand_configs=[{"bet": 1_000_000, "sideBets": {"pp": 0, "t": 0}}],
            )

    def test_service_rejects_disallowed_side_bet_level(self):
        service = MockBlackjackService(seed=42)
        with self.assertRaisesRegex(ValueError, "Side bet pp is not"):
            service.play(
                session_id="bad-sidebet-session",
                amount=1_250_000,
                mode="BASE",
                hand_configs=[{"bet": 1_000_000, "sideBets": {"pp": 250_000, "t": 0}}],
            )

    def test_backend_config_reads_env_overrides(self):
        config = load_backend_config({
            "MOCK_RGS_HOST": "0.0.0.0",
            "MOCK_RGS_PORT": "9999",
            "MOCK_RGS_STORAGE": "/tmp/mock-rgs.json",
            "MOCK_RGS_SEED": "777",
        })
        self.assertEqual(config.host, "0.0.0.0")
        self.assertEqual(config.port, 9999)
        self.assertEqual(str(config.storage_path), "/tmp/mock-rgs.json")
        self.assertEqual(config.seed, 777)


if __name__ == "__main__":
    unittest.main()
