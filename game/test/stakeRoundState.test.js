import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoundStateSnapshot,
  canHydrateRoundState,
  ROUND_STATE_SCHEMA_VERSION,
} from "../src/game/stakeRoundState.js";

test("buildRoundStateSnapshot preserves blackjack resume-relevant fields", () => {
  const snapshot = buildRoundStateSnapshot({
    phase: "play",
    dealerHand: [{ rank: "A", suit: "spades" }],
    hands: [{
      bet: 2_000_000,
      sb: { pp: 500_000, t: 500_000 },
      cards: [{ rank: "9", suit: "clubs" }, { rank: "7", suit: "hearts" }],
      result: null,
      payout: 0,
      done: false,
      doubled: false,
      sideBetResults: [],
    }],
    activeHand: 0,
    pending: {
      dealerCards: [{ rank: "A", suit: "spades" }, { rank: "K", suit: "clubs" }],
      dealerBJ: false,
      insuranceAmount: 1_000_000,
    },
    message: "",
  });

  assert.deepEqual(snapshot, {
    schemaVersion: ROUND_STATE_SCHEMA_VERSION,
    phase: "play",
    activeHand: 0,
    allowedActions: ["insurance-yes", "insurance-no"],
    dealerHand: [{ rank: "A", suit: "spades" }],
    shoe: [],
    hands: [{
      bet: 2_000_000,
      sideBets: { pp: 500_000, t: 500_000 },
      cards: [{ rank: "9", suit: "clubs" }, { rank: "7", suit: "hearts" }],
      result: null,
      payout: 0,
      done: false,
      doubled: false,
      sideBetResults: [],
    }],
    pendingInsurance: {
      dealerCards: [{ rank: "A", suit: "spades" }, { rank: "K", suit: "clubs" }],
      dealerBJ: false,
      insuranceAmount: 1_000_000,
    },
    message: "",
    lossStreak: 0,
  });
});

test("canHydrateRoundState requires resumable blackjack fields", () => {
  assert.equal(canHydrateRoundState({
    schemaVersion: ROUND_STATE_SCHEMA_VERSION,
    phase: "play",
    allowedActions: [],
    dealerHand: [],
    hands: [],
    shoe: [],
  }), true);
  assert.equal(canHydrateRoundState({
    schemaVersion: ROUND_STATE_SCHEMA_VERSION,
    phase: "play",
    allowedActions: [],
    dealerHand: [],
    hands: [],
  }), false);
});
