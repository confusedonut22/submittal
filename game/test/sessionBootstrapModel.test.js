import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBootstrapState,
  hasActiveRound,
} from "../src/game/sessionBootstrapModel.js";

test("buildBootstrapState returns local mode when no Stake launch context exists", () => {
  const state = buildBootstrapState({ localMode: true });
  assert.equal(state.status, "local");
  assert.equal(state.localMode, true);
});

test("hasActiveRound detects active round states", () => {
  assert.equal(hasActiveRound({ active: true, state: "completed" }), true);
  assert.equal(hasActiveRound({ active: false, state: "completed" }), false);
});

test("buildBootstrapState marks active rounds as resume-blocked", () => {
  const state = buildBootstrapState({
    auth: {
      balance: 125_000_000,
      config: { minBet: 1_000_000 },
      round: { betID: 9, active: true, mode: "BASE", state: { step: "playerTurn" } },
    },
  });

  assert.equal(state.status, "resume-blocked");
  assert.equal(state.resumeBlocked, true);
  assert.equal(state.balance, 125_000_000);
});

test("buildBootstrapState marks hydratable active rounds as resumable", () => {
  const state = buildBootstrapState({
    auth: {
      balance: 125_000_000,
      config: { minBet: 1_000_000 },
      round: {
        betID: 9,
        active: true,
        mode: "BASE",
        state: {
          phase: "play",
          dealerHand: [],
          hands: [],
          shoe: [],
        },
      },
    },
  });

  assert.equal(state.status, "resumable");
  assert.equal(state.resumeBlocked, false);
});
