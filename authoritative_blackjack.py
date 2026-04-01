"""
Authoritative blackjack round service for local Stake-style RGS scaffolding.

This module owns round creation, action progression, and state snapshots so the
frontend can stop inventing round outcomes locally when a mock RGS is available.
"""

from __future__ import annotations

import json
from pathlib import Path
import random
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from engine import (
    BJ_MULTIPLIER,
    MONEY_SCALE,
    Card,
    HandResult,
    HandState,
    Shoe,
    SideBetType,
    calculate_insurance_amount,
    dealer_play,
    evaluate_21_plus_3,
    evaluate_insurance,
    evaluate_perfect_pairs,
    hand_value,
    is_blackjack,
    resolve_hand,
    resolve_hand_state,
    split_value,
)

ROUND_STATE_SCHEMA_VERSION = 1


def card_to_dict(card: Card) -> Dict[str, str]:
    return {"rank": card.rank, "suit": card.suit}


def card_from_dict(payload: Dict[str, Any]) -> Card:
    return Card(rank=str(payload["rank"]), suit=str(payload["suit"]))


def side_bet_results_to_dict(results) -> List[Dict[str, Any]]:
    items = []
    for result in results:
      key = "PP" if result.bet_type == SideBetType.PERFECT_PAIRS else "21+3"
      items.append({
          "type": key,
          "won": result.won,
          "name": result.name,
          "multiplier": result.multiplier,
          "payout": result.payout,
      })
    return items


def _can_split(hand: Dict[str, Any], session_balance: int, extra_debits: int) -> bool:
    """Return True if the hand is eligible to be split."""
    # Must have exactly 2 cards
    if len(hand["cards"]) != 2:
        return False
    # Already split-aces-locked hands cannot be split again
    if hand.get("isSplitAcesLocked", False):
        return False
    # Cards must be the same value (10/J/Q/K all count as 10)
    a, b = hand["cards"]
    if not (a.rank == b.rank or split_value(a) == split_value(b)):
        return False
    # Player must have enough balance for the additional bet
    if session_balance - extra_debits < hand["bet"]:
        return False
    return True


def allowed_actions_for_round(round_record: "AuthoritativeRound", session_balance: int = 0) -> List[str]:
    if round_record.pending_insurance:
        return ["insurance-yes", "insurance-no"]
    if round_record.phase == "PLAY" and round_record.active_hand >= 0:
        actions = ["hit", "stand"]
        hand = round_record.hands[round_record.active_hand]
        # Double allowed on first 2 cards; ALLOW_DAS = False so no double after split
        is_split_hand = hand.get("isSplitHand", False)
        is_split_aces_locked = hand.get("isSplitAcesLocked", False)
        if len(hand["cards"]) == 2 and not is_split_hand and not is_split_aces_locked:
            actions.append("double")
        # Split: same rank/value, not split-aces-locked, sufficient balance
        if _can_split(hand, session_balance, round_record.extra_debits):
            actions.append("split")
        return actions
    if round_record.phase == "RESULT":
        return ["end-round"]
    return []


def validate_snapshot_shape(snapshot: Dict[str, Any]) -> None:
    if not isinstance(snapshot, dict):
        raise ValueError("Round state must be an object")
    schema_version = snapshot.get("schemaVersion")
    if schema_version not in (None, ROUND_STATE_SCHEMA_VERSION):
        raise ValueError("Unsupported round state schemaVersion")
    if not isinstance(snapshot.get("phase"), str):
        raise ValueError("Round state missing phase")
    if not isinstance(snapshot.get("dealerHand"), list):
        raise ValueError("Round state missing dealerHand")
    if not isinstance(snapshot.get("hands"), list):
        raise ValueError("Round state missing hands")
    if not isinstance(snapshot.get("shoe"), list):
        raise ValueError("Round state missing shoe")
    if not isinstance(snapshot.get("allowedActions", []), list):
        raise ValueError("Round state allowedActions must be a list")


def build_message(hands) -> str:
    any_loss = any(hand["result"] in {"lose", "bust"} for hand in hands)
    any_win = any(hand["result"] in {"win", "blackjack"} for hand in hands)
    wins = sum(1 for hand in hands if hand["result"] in {"win", "blackjack"})
    losses = sum(1 for hand in hands if hand["result"] in {"lose", "bust"})
    if any_win and not any_loss:
        return "You Win!"
    if any_loss and not any_win:
        return "Dealer Wins"
    return f"{wins}W {losses}L"


@dataclass
class AuthoritativeRound:
    bet_id: int
    mode: str
    total_wagered: int
    initial_debit: int
    shoe_cards: List[Card]
    dealer_cards: List[Card]
    hands: List[Dict[str, Any]]
    phase: str = "PLAY"
    active_hand: int = -1
    pending_insurance: Optional[Dict[str, Any]] = None
    message: str = ""
    loss_streak: int = 0
    extra_debits: int = 0
    total_returned: int = 0
    active: bool = True
    last_event: str = ""

    def next_active_hand(self) -> int:
        for index in range(len(self.hands) - 1, -1, -1):
            if not self.hands[index]["done"]:
                return index
        return -1

    def snapshot(self, session_balance: int = 0) -> Dict[str, Any]:
        snapshot = {
            "schemaVersion": ROUND_STATE_SCHEMA_VERSION,
            "phase": self.phase,
            "activeHand": self.active_hand,
            "allowedActions": allowed_actions_for_round(self, session_balance=session_balance),
            "dealerHand": [card_to_dict(card) for card in self.dealer_cards],
            "shoe": [card_to_dict(card) for card in self.shoe_cards],
            "hands": [
                {
                    "bet": hand["bet"],
                    "sideBets": hand["sideBets"],
                    "cards": [card_to_dict(card) for card in hand["cards"]],
                    "result": hand["result"],
                    "payout": hand["payout"],
                    "done": hand["done"],
                    "doubled": hand["doubled"],
                    "sideBetResults": hand["sideBetResults"],
                    "isSplitHand": hand.get("isSplitHand", False),
                    "countsAsBlackjack": hand.get("countsAsBlackjack", True),
                    "isSplitAcesLocked": hand.get("isSplitAcesLocked", False),
                }
                for hand in self.hands
            ],
            "pendingInsurance": self.pending_insurance,
            "message": self.message,
            "lossStreak": self.loss_streak,
        }
        validate_snapshot_shape(snapshot)
        return snapshot

    def as_round_payload(self, session_balance: int = 0) -> Dict[str, Any]:
        return {
            "betID": self.bet_id,
            "amount": self.total_wagered,
            "payout": self.total_returned if self.phase == "RESULT" else None,
            "payoutMultiplier": (
                (self.total_returned / self.total_wagered) if self.phase == "RESULT" and self.total_wagered else None
            ),
            "active": self.active,
            "mode": self.mode,
            "event": self.last_event,
            "state": self.snapshot(session_balance=session_balance),
        }


@dataclass
class SessionRecord:
    session_id: str
    balance: int = 1_000_000_000
    currency: str = "USD"
    shoe: Shoe = field(default_factory=Shoe)
    next_bet_id: int = 1
    round: Optional[AuthoritativeRound] = None
    history: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def config(self) -> Dict[str, Any]:
        return {
            "minBet": 500_000,
            "maxBet": 100_000_000,
            "stepBet": 500_000,
            "defaultBetLevel": 1_000_000,
            "betLevels": [500_000, 1_000_000, 5_000_000, 25_000_000, 100_000_000],
            "sideBets": {
                "pp": {
                    "minBet": 100_000,
                    "maxBet": 100_000_000,
                    "stepBet": 100_000,
                    "defaultBetLevel": 100_000,
                },
                "t": {
                    "minBet": 100_000,
                    "maxBet": 100_000_000,
                    "stepBet": 100_000,
                    "defaultBetLevel": 100_000,
                },
            },
            "jurisdiction": {
                "socialCasino": False,
                "disabledFullscreen": False,
                "disabledTurbo": False,
                "disabledSuperTurbo": False,
                "disabledAutoplay": False,
                "disabledSlamstop": False,
                "disabledSpacebar": False,
                "disabledBuyFeature": True,
                "displayNetPosition": False,
                "displayRTP": True,
                "displaySessionTimer": False,
                "minimumRoundDuration": 0,
            },
        }


class MockBlackjackService:
    def __init__(self, seed: int = 1337, storage_path: Optional[str] = None):
        self.sessions: Dict[str, SessionRecord] = {}
        self.rng = random.Random(seed)
        self.storage_path = Path(storage_path) if storage_path else None
        self._load()

    def get_session(self, session_id: str) -> SessionRecord:
        if session_id not in self.sessions:
            self.sessions[session_id] = SessionRecord(
                session_id=session_id,
                shoe=Shoe(rng=random.Random(self.rng.randint(1, 10_000_000))),
            )
            self._save()
        return self.sessions[session_id]

    def authenticate(self, session_id: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        return {
            "balance": {"amount": session.balance, "currency": session.currency},
            "config": session.config(),
            "round": session.round.as_round_payload(session_balance=session.balance) if session.round else None,
        }

    def balance(self, session_id: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        return {
            "balance": {"amount": session.balance, "currency": session.currency},
        }

    def _normalize_hand_configs(
        self,
        session: SessionRecord,
        hand_configs: List[Dict[str, Any]],
        declared_amount: int,
    ) -> tuple[List[Dict[str, Any]], int]:
        if not isinstance(hand_configs, list) or not hand_configs:
            raise ValueError("Play requires at least one hand config")
        if len(hand_configs) > 5:
            raise ValueError("Play supports at most five hands")

        config = session.config()
        allowed_bets = {int(level) for level in config.get("betLevels", [])}
        min_bet = int(config.get("minBet", 0))
        max_bet = int(config.get("maxBet", 0))
        side_bet_config = config.get("sideBets", {})

        normalized_hands = []
        computed_amount = 0
        for hand_config in hand_configs:
            if not isinstance(hand_config, dict):
                raise ValueError("Invalid hand config")
            bet = int(hand_config.get("bet", 0))
            if bet <= 0:
                raise ValueError("Hand bet must be positive")
            if bet < min_bet or (max_bet > 0 and bet > max_bet):
                raise ValueError("Hand bet is outside configured limits")
            if allowed_bets and bet not in allowed_bets:
                raise ValueError("Hand bet is not an allowed bet level")

            raw_side_bets = hand_config.get("sideBets", {})
            side_bets = {
                "pp": int(raw_side_bets.get("pp", 0)),
                "t": int(raw_side_bets.get("t", 0)),
            }
            if side_bets["pp"] < 0 or side_bets["t"] < 0:
                raise ValueError("Side bets must be non-negative")
            for key, amount in side_bets.items():
                if amount == 0:
                    continue
                sb_rules = side_bet_config.get(key, {})
                sb_levels = {int(level) for level in sb_rules.get("betLevels", [])}
                if sb_levels and amount not in sb_levels:
                    raise ValueError(f"Side bet {key} is not an allowed bet level")
                sb_min = int(sb_rules.get("minBet", 0))
                sb_max = int(sb_rules.get("maxBet", 0))
                sb_step = int(sb_rules.get("stepBet", 0))
                if sb_min and amount < sb_min:
                    raise ValueError(f"Side bet {key} is below minimum")
                if sb_max and amount > sb_max:
                    raise ValueError(f"Side bet {key} is above maximum")
                if sb_step > 0:
                    sb_base = sb_min if sb_min > 0 else 0
                    if (amount - sb_base) % sb_step != 0:
                        raise ValueError(f"Side bet {key} is not on a valid step")

            normalized_hands.append({
                "bet": bet,
                "sideBets": side_bets,
            })
            computed_amount += bet + side_bets["pp"] + side_bets["t"]

        if int(declared_amount) != computed_amount:
            raise ValueError("Declared amount does not match hand config total")

        return normalized_hands, computed_amount

    def play(self, session_id: str, amount: int, mode: str, hand_configs: List[Dict[str, Any]]) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if session.round and session.round.active:
            raise ValueError("A round is already active")
        normalized_configs, computed_amount = self._normalize_hand_configs(session, hand_configs, amount)
        amount = computed_amount
        if amount > session.balance:
            raise ValueError("Insufficient balance")

        normalized_hands = []
        dealer_cards = [session.shoe.draw(), session.shoe.draw()]
        for config in normalized_configs:
            cards = [session.shoe.draw(), session.shoe.draw()]
            normalized_hands.append({
                "cards": cards,
                "bet": int(config["bet"]),
                "sideBets": config["sideBets"],
                "result": None,
                "payout": 0,
                "done": False,
                "doubled": False,
                "sideBetResults": [],
                "isSplitHand": False,
                "countsAsBlackjack": True,
                "isSplitAcesLocked": False,
            })

        session.balance -= amount
        round_record = AuthoritativeRound(
            bet_id=session.next_bet_id,
            mode=mode or "BASE",
            total_wagered=amount,
            initial_debit=amount,
            shoe_cards=list(session.shoe.cards),
            dealer_cards=dealer_cards,
            hands=normalized_hands,
        )
        session.next_bet_id += 1

        self._resolve_initial(round_record)
        session.round = round_record
        self._save()
        return {
            "balance": {"amount": session.balance, "currency": session.currency},
            "round": round_record.as_round_payload(session_balance=session.balance),
        }

    def event(self, session_id: str, event_payload: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if not session.round or not session.round.active:
            raise ValueError("No active round")
        envelope = json.loads(event_payload)
        self._validate_event_envelope(session.round, envelope)
        event = envelope.get("event", {})
        self._apply_event(session, session.round, event)
        session.round.last_event = event.get("type", "")
        self._save()
        return {
            "event": json.dumps({
                "betID": session.round.bet_id,
                "mode": session.round.mode,
                "sequence": envelope.get("sequence"),
                "event": event,
                "state": session.round.snapshot(session_balance=session.balance),
                "active": session.round.active,
            }),
        }

    def end_round(self, session_id: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if not session.round:
            return {"balance": {"amount": session.balance, "currency": session.currency}}
        if session.round.phase != "RESULT":
            raise ValueError("Round is not complete")
        replay_key = str(session.round.bet_id)
        final_balance = session.balance - session.round.extra_debits + session.round.total_returned
        session.history[replay_key] = {
            "event": replay_key,
            "round": session.round.as_round_payload(session_balance=final_balance),
        }
        session.balance = final_balance
        session.round.active = False
        session.round = None
        self._save()
        return {"balance": {"amount": session.balance, "currency": session.currency}}

    def replay(self, session_id: str, event_id: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        replay = session.history.get(str(event_id))
        if not replay:
            raise ValueError("Replay event not found")
        return replay

    def replay_by_event_id(self, event_id: str) -> Dict[str, Any]:
        """Search all sessions for the given event ID and return the official
        Stake Bet Replay response schema:
        {
            "payoutMultiplier": float | None,
            "costMultiplier": float,
            "state": { ...game-specific state... }
        }
        """
        key = str(event_id)
        for session in self.sessions.values():
            entry = session.history.get(key)
            if entry is not None:
                round_payload = entry.get("round", {})
                payout_multiplier = round_payload.get("payoutMultiplier")
                state = round_payload.get("state") or {}

                # Derive costMultiplier: actual cost vs. initial bet
                # total_wagered reflects the full cost including doubles/insurance.
                # For replay purposes costMultiplier is 1.0 (the player paid 1x
                # the declared amount when the round was started; extra debits are
                # already folded into payoutMultiplier by the RGS).
                cost_multiplier = 1.0

                return {
                    "payoutMultiplier": float(payout_multiplier) if payout_multiplier is not None else None,
                    "costMultiplier": cost_multiplier,
                    "state": state,
                }
        raise ValueError(f"Replay event not found: {event_id}")

    def _validate_event_envelope(self, round_record: AuthoritativeRound, envelope: Dict[str, Any]) -> None:
        if not isinstance(envelope, dict):
            raise ValueError("Event payload must be an object")
        schema_version = envelope.get("schemaVersion")
        if schema_version not in (None, ROUND_STATE_SCHEMA_VERSION):
            raise ValueError("Unsupported event schemaVersion")
        sequence = envelope.get("sequence")
        if not isinstance(sequence, int) or sequence <= 0:
            raise ValueError("Event sequence must be a positive integer")
        bet_id = envelope.get("betID")
        if bet_id is not None and int(bet_id) != round_record.bet_id:
            raise ValueError("Event betID does not match active round")
        mode = envelope.get("mode")
        if mode is not None and str(mode) != round_record.mode:
            raise ValueError("Event mode does not match active round")
        state = envelope.get("state")
        if state is not None:
            validate_snapshot_shape(state)
        event = envelope.get("event")
        if not isinstance(event, dict):
            raise ValueError("Event body must be an object")
        event_type = event.get("type")
        if event_type == "insuranceDecision":
            if not isinstance(event.get("accepted"), bool):
                raise ValueError("Insurance decision requires accepted boolean")
            return
        if event_type == "playerAction":
            action = event.get("action")
            if action not in {"hit", "stand", "double", "split"}:
                raise ValueError("Unsupported player action")
            if "handIndex" in event and not isinstance(event.get("handIndex"), int):
                raise ValueError("playerAction handIndex must be an integer")
            return
        raise ValueError("Unsupported event type")

    def _save(self) -> None:
        if not self.storage_path:
            return
        payload = {
            "sessions": {session_id: self._serialize_session(session) for session_id, session in self.sessions.items()}
        }
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.storage_path.write_text(json.dumps(payload), encoding="utf-8")

    def _load(self) -> None:
        if not self.storage_path or not self.storage_path.exists():
            return
        payload = json.loads(self.storage_path.read_text(encoding="utf-8"))
        self.sessions = {
            session_id: self._deserialize_session(session_payload)
            for session_id, session_payload in payload.get("sessions", {}).items()
        }

    def _serialize_session(self, session: SessionRecord) -> Dict[str, Any]:
        return {
            "session_id": session.session_id,
            "balance": session.balance,
            "currency": session.currency,
            "next_bet_id": session.next_bet_id,
            "shoe_cards": [card_to_dict(card) for card in session.shoe.cards],
            "round": self._serialize_round(session.round) if session.round else None,
            "history": session.history,
        }

    def _deserialize_session(self, payload: Dict[str, Any]) -> SessionRecord:
        rng = random.Random(self.rng.randint(1, 10_000_000))
        shoe = Shoe(rng=rng)
        shoe.cards = [card_from_dict(card) for card in payload.get("shoe_cards", [])]
        return SessionRecord(
            session_id=payload["session_id"],
            balance=int(payload.get("balance", 1_000_000_000)),
            currency=str(payload.get("currency", "USD")),
            shoe=shoe,
            next_bet_id=int(payload.get("next_bet_id", 1)),
            round=self._deserialize_round(payload.get("round")) if payload.get("round") else None,
            history=payload.get("history", {}),
        )

    def _serialize_round(self, round_record: AuthoritativeRound) -> Dict[str, Any]:
        return {
            "bet_id": round_record.bet_id,
            "mode": round_record.mode,
            "total_wagered": round_record.total_wagered,
            "initial_debit": round_record.initial_debit,
            "shoe_cards": [card_to_dict(card) for card in round_record.shoe_cards],
            "dealer_cards": [card_to_dict(card) for card in round_record.dealer_cards],
            "hands": [
                {
                    **hand,
                    "cards": [card_to_dict(card) for card in hand["cards"]],
                }
                for hand in round_record.hands
            ],
            "phase": round_record.phase,
            "active_hand": round_record.active_hand,
            "pending_insurance": round_record.pending_insurance,
            "message": round_record.message,
            "loss_streak": round_record.loss_streak,
            "extra_debits": round_record.extra_debits,
            "total_returned": round_record.total_returned,
            "active": round_record.active,
            "last_event": round_record.last_event,
        }

    def _deserialize_round(self, payload: Optional[Dict[str, Any]]) -> Optional[AuthoritativeRound]:
        if not payload:
            return None

        def _deserialize_hand(hand: Dict[str, Any]) -> Dict[str, Any]:
            deserialized = dict(hand)
            deserialized["cards"] = [card_from_dict(card) for card in hand.get("cards", [])]
            # Ensure split-related fields have defaults for backwards compatibility
            deserialized.setdefault("isSplitHand", False)
            deserialized.setdefault("countsAsBlackjack", True)
            deserialized.setdefault("isSplitAcesLocked", False)
            return deserialized

        return AuthoritativeRound(
            bet_id=int(payload["bet_id"]),
            mode=str(payload["mode"]),
            total_wagered=int(payload["total_wagered"]),
            initial_debit=int(payload["initial_debit"]),
            shoe_cards=[card_from_dict(card) for card in payload.get("shoe_cards", [])],
            dealer_cards=[card_from_dict(card) for card in payload.get("dealer_cards", [])],
            hands=[_deserialize_hand(hand) for hand in payload.get("hands", [])],
            phase=str(payload.get("phase", "PLAY")),
            active_hand=int(payload.get("active_hand", -1)),
            pending_insurance=payload.get("pending_insurance"),
            message=str(payload.get("message", "")),
            loss_streak=int(payload.get("loss_streak", 0)),
            extra_debits=int(payload.get("extra_debits", 0)),
            total_returned=int(payload.get("total_returned", 0)),
            active=bool(payload.get("active", True)),
            last_event=str(payload.get("last_event", "")),
        )

    def _resolve_initial(self, round_record: AuthoritativeRound) -> None:
        dealer_up = round_record.dealer_cards[0]
        dealer_bj = is_blackjack(round_record.dealer_cards)

        for hand in round_record.hands:
            if hand["sideBets"]["pp"] > 0:
                result = evaluate_perfect_pairs(hand["cards"][0], hand["cards"][1], hand["sideBets"]["pp"])
                hand["sideBetResults"].append(side_bet_results_to_dict([result])[0])
            if hand["sideBets"]["t"] > 0:
                result = evaluate_21_plus_3(hand["cards"][0], hand["cards"][1], dealer_up, hand["sideBets"]["t"])
                hand["sideBetResults"].append(side_bet_results_to_dict([result])[0])

            counts_as_bj = hand.get("countsAsBlackjack", True)
            player_blackjack = counts_as_bj and is_blackjack(hand["cards"])
            if player_blackjack and dealer_bj:
                hand["result"] = "push"
                hand["payout"] = hand["bet"]
                hand["done"] = True
            elif player_blackjack:
                hand["result"] = "blackjack"
                hand["payout"] = hand["bet"] + int(hand["bet"] * BJ_MULTIPLIER)
                hand["done"] = True
            elif dealer_bj:
                hand["result"] = "lose"
                hand["payout"] = 0
                hand["done"] = True

        if dealer_up.rank == "A":
            insurance_amount = calculate_insurance_amount(sum(hand["bet"] for hand in round_record.hands))
            round_record.pending_insurance = {
                "dealerCards": [card_to_dict(card) for card in round_record.dealer_cards],
                "dealerBJ": dealer_bj,
                "insuranceAmount": insurance_amount,
            }
            round_record.phase = "INS"
            round_record.active_hand = -1
            return

        self._finish_initial_resolution(round_record)

    def _finish_initial_resolution(self, round_record: AuthoritativeRound) -> None:
        round_record.active_hand = round_record.next_active_hand()
        if round_record.active_hand >= 0:
            round_record.phase = "PLAY"
        else:
            round_record.phase = "RESULT"
            round_record.total_returned = self._total_returned(round_record)
            round_record.message = build_message(round_record.hands)

    def _apply_event(self, session: SessionRecord, round_record: AuthoritativeRound, event: Dict[str, Any]) -> None:
        event_type = event.get("type")
        if event_type == "insuranceDecision":
            self._apply_insurance(round_record, bool(event.get("accepted")))
            return
        if event_type != "playerAction":
            return

        hand_index = int(event.get("handIndex", round_record.active_hand))
        if hand_index < 0 or hand_index >= len(round_record.hands):
            raise ValueError("Invalid hand index")
        hand = round_record.hands[hand_index]
        action = event.get("action")
        if action == "hit":
            hand["cards"].append(session.shoe.draw())
            value = hand_value(hand["cards"])
            if value > 21:
                hand["result"] = "bust"
                hand["payout"] = 0
                hand["done"] = True
            elif value == 21:
                hand["done"] = True
        elif action == "stand":
            hand["done"] = True
        elif action == "double":
            if hand.get("isSplitHand", False):
                raise ValueError("Double after split is not allowed")
            if hand.get("isSplitAcesLocked", False):
                raise ValueError("Cannot double a split-aces-locked hand")
            if session.balance - round_record.extra_debits < hand["bet"]:
                raise ValueError("Insufficient balance for double")
            round_record.extra_debits += hand["bet"]
            hand["bet"] *= 2
            hand["doubled"] = True
            hand["cards"].append(session.shoe.draw())
            value = hand_value(hand["cards"])
            if value > 21:
                hand["result"] = "bust"
                hand["payout"] = 0
            hand["done"] = True
        elif action == "split":
            # Validate eligibility
            if len(hand["cards"]) != 2:
                raise ValueError("Can only split a hand with exactly 2 cards")
            if hand.get("isSplitAcesLocked", False):
                raise ValueError("Cannot split a split-aces-locked hand")
            a, b = hand["cards"]
            if not (a.rank == b.rank or split_value(a) == split_value(b)):
                raise ValueError("Cards must be the same rank or value to split")
            if session.balance - round_record.extra_debits < hand["bet"]:
                raise ValueError("Insufficient balance for split")

            splitting_aces = (a.rank == "A" and b.rank == "A")
            original_bet = hand["bet"]

            # Charge the extra bet
            round_record.extra_debits += original_bet
            round_record.total_wagered += original_bet

            # Build the two new hands
            new_card_a = session.shoe.draw()
            new_card_b = session.shoe.draw()

            hand_a = {
                "cards": [a, new_card_a],
                "bet": original_bet,
                "sideBets": {"pp": 0, "t": 0},
                "result": None,
                "payout": 0,
                "done": splitting_aces,  # split aces get exactly one card and are locked
                "doubled": False,
                "sideBetResults": [],
                "isSplitHand": True,
                "countsAsBlackjack": False,
                "isSplitAcesLocked": splitting_aces,
            }
            hand_b = {
                "cards": [b, new_card_b],
                "bet": original_bet,
                "sideBets": {"pp": 0, "t": 0},
                "result": None,
                "payout": 0,
                "done": splitting_aces,
                "doubled": False,
                "sideBetResults": [],
                "isSplitHand": True,
                "countsAsBlackjack": False,
                "isSplitAcesLocked": splitting_aces,
            }

            # Replace the original hand with the two split hands
            round_record.hands[hand_index:hand_index + 1] = [hand_a, hand_b]

            # Update shoe snapshot and active hand
            round_record.shoe_cards = list(session.shoe.cards)
            round_record.active_hand = round_record.next_active_hand()
            if round_record.active_hand >= 0:
                round_record.phase = "PLAY"
            else:
                # All hands done (e.g. split aces with no further play)
                round_record.dealer_cards = dealer_play(round_record.dealer_cards, session.shoe)
                for h in round_record.hands:
                    if h["result"] is None:
                        hs = HandState(cards=list(h["cards"]), bet=h["bet"],
                                       counts_as_blackjack=h.get("countsAsBlackjack", True))
                        result, payout = resolve_hand_state(hs, round_record.dealer_cards)
                        h["result"] = result.value if isinstance(result, HandResult) else str(result)
                        h["payout"] = payout
                round_record.phase = "RESULT"
                round_record.total_returned = self._total_returned(round_record)
                round_record.message = build_message(round_record.hands)
                round_record.shoe_cards = list(session.shoe.cards)
            return
        else:
            raise ValueError("Unsupported player action")

        round_record.active_hand = round_record.next_active_hand()
        if round_record.active_hand >= 0:
            round_record.phase = "PLAY"
            round_record.shoe_cards = list(session.shoe.cards)
            return

        round_record.dealer_cards = dealer_play(round_record.dealer_cards, session.shoe)
        for hand in round_record.hands:
            if hand["result"] is None:
                hs = HandState(cards=list(hand["cards"]), bet=hand["bet"],
                               counts_as_blackjack=hand.get("countsAsBlackjack", True))
                result, payout = resolve_hand_state(hs, round_record.dealer_cards)
                hand["result"] = result.value if isinstance(result, HandResult) else str(result)
                hand["payout"] = payout

        round_record.phase = "RESULT"
        round_record.total_returned = self._total_returned(round_record)
        round_record.message = build_message(round_record.hands)
        round_record.shoe_cards = list(session.shoe.cards)

    def _apply_insurance(self, round_record: AuthoritativeRound, accepted: bool) -> None:
        pending = round_record.pending_insurance
        if not pending:
            raise ValueError("Insurance not available")
        round_record.pending_insurance = None
        if accepted:
            round_record.extra_debits += int(pending["insuranceAmount"])
        round_record.phase = "PLAY"
        round_record.active_hand = round_record.next_active_hand()
        dealer_has_bj = is_blackjack(round_record.dealer_cards)
        if accepted:
            round_record.hands[0]["insuranceTaken"] = True
        if dealer_has_bj:
            round_record.active_hand = -1
            round_record.phase = "RESULT"
            round_record.total_returned = self._total_returned(round_record, insurance_taken=accepted, insurance_amount=int(pending["insuranceAmount"]))
            round_record.message = build_message(round_record.hands)
            return
        self._finish_initial_resolution(round_record)

    def _total_returned(self, round_record: AuthoritativeRound, insurance_taken: bool = False, insurance_amount: int = 0) -> int:
        total = 0
        for hand in round_record.hands:
            total += int(hand.get("payout", 0))
            for sidebet in hand.get("sideBetResults", []):
                if sidebet.get("won"):
                    total += int(sidebet.get("payout", 0))
        if insurance_taken and insurance_amount > 0:
            _, payout = evaluate_insurance(round_record.dealer_cards, insurance_amount)
            total += payout
        return total
