import test from "node:test";
import assert from "node:assert/strict";

import {
  isAllowedStakeBet,
  isAllowedStakeSideBet,
  normalizeStakeConfig,
  resolveDefaultStakeBet,
} from "../src/game/betConfig.js";

test("normalizeStakeConfig parses integer config values", () => {
  const config = normalizeStakeConfig({
    minBet: "1000000",
    maxBet: "10000000",
    stepBet: "1000000",
    defaultBetLevel: "2000000",
    betLevels: ["1000000", { value: "2000000" }, 5000000],
  });

  assert.deepEqual(config, {
    minBet: 1_000_000,
    maxBet: 10_000_000,
    stepBet: 1_000_000,
    defaultBetLevel: 2_000_000,
    betLevels: [1_000_000, 2_000_000, 5_000_000],
    sideBets: { pp: null, t: null },
  });
});

test("isAllowedStakeBet respects betLevels when present", () => {
  const config = normalizeStakeConfig({
    betLevels: [1_000_000, 2_000_000, 5_000_000],
  });

  assert.equal(isAllowedStakeBet(2_000_000, config), true);
  assert.equal(isAllowedStakeBet(3_000_000, config), false);
});

test("resolveDefaultStakeBet falls back to normalized defaults", () => {
  const config = normalizeStakeConfig({
    minBet: 1_000_000,
    defaultBetLevel: 2_000_000,
  });

  assert.equal(resolveDefaultStakeBet(config, 500_000), 2_000_000);
});

test("normalizeStakeConfig preserves side-bet config and validates side-bet levels", () => {
  const config = normalizeStakeConfig({
    sideBets: {
      pp: { betLevels: ["500000", "1000000"] },
      t: { minBet: "500000", stepBet: "500000" },
    },
  });

  assert.deepEqual(config.sideBets.pp, {
    minBet: null,
    maxBet: null,
    stepBet: null,
    defaultBetLevel: 500_000,
    betLevels: [500_000, 1_000_000],
  });
  assert.equal(isAllowedStakeSideBet(500_000, "pp", config), true);
  assert.equal(isAllowedStakeSideBet(750_000, "pp", config), false);
  assert.equal(isAllowedStakeSideBet(0, "pp", config), true);
  assert.equal(isAllowedStakeSideBet(1_500_000, "t", config), true);
});
