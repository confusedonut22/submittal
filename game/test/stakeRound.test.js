import test from "node:test";
import assert from "node:assert/strict";

import {
  buildStakeEventPayload,
  hasActiveStakeRound,
  normalizeStakeRound,
} from "../src/game/stakeRound.js";
import { ROUND_STATE_SCHEMA_VERSION } from "../src/game/stakeRoundState.js";

test("normalizeStakeRound aligns official betID/active shape", () => {
  const round = normalizeStakeRound({
    betID: "42",
    amount: "2000000",
    payout: "3000000",
    payoutMultiplier: 1.5,
    active: true,
    mode: "BASE",
    event: "initialDeal",
    state: { dealerUp: "A" },
  });

  assert.deepEqual(round, {
    betID: 42,
    amount: 2_000_000,
    payout: 3_000_000,
    payoutMultiplier: 1.5,
    active: true,
    mode: "BASE",
    event: "initialDeal",
    state: { dealerUp: "A" },
    raw: {
      betID: "42",
      amount: "2000000",
      payout: "3000000",
      payoutMultiplier: 1.5,
      active: true,
      mode: "BASE",
      event: "initialDeal",
      state: { dealerUp: "A" },
    },
  });
});

test("hasActiveStakeRound prefers official active flag", () => {
  assert.equal(hasActiveStakeRound({ active: true, state: "completed" }), true);
  assert.equal(hasActiveStakeRound({ active: false, status: "completed" }), false);
});

test("buildStakeEventPayload wraps structured events with bet metadata", () => {
  const payload = JSON.parse(buildStakeEventPayload({
    round: { betID: 77, active: true, mode: "BASE" },
    sequence: 3,
    event: { type: "playerAction", action: "hit" },
    state: { phase: "play" },
  }));

  assert.deepEqual(payload, {
    schemaVersion: ROUND_STATE_SCHEMA_VERSION,
    betID: 77,
    mode: "BASE",
    sequence: 3,
    event: { type: "playerAction", action: "hit" },
    state: { phase: "play" },
  });
});

test("buildStakeEventPayload rejects invalid sequences", () => {
  assert.throws(() => {
    buildStakeEventPayload({
      round: { betID: 77, active: true, mode: "BASE" },
      sequence: 0,
      event: { type: "playerAction", action: "hit" },
      state: { phase: "play" },
    });
  }, /positive integer/);
});
