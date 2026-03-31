import test from "node:test";
import assert from "node:assert/strict";

import { formatCurrencyAmount, formatSessionDuration, formatSignedMoney } from "../src/game/sessionDisplay.js";

test("formatSessionDuration renders mm:ss for short sessions", () => {
  assert.equal(formatSessionDuration(0), "00:00");
  assert.equal(formatSessionDuration(61_000), "01:01");
});

test("formatSessionDuration renders hh:mm:ss for long sessions", () => {
  assert.equal(formatSessionDuration(3_661_000), "01:01:01");
});

test("formatSignedMoney renders signed currency values", () => {
  assert.equal(formatSignedMoney(5_000_000), "+$5.00");
  assert.equal(formatSignedMoney(-2_500_000), "-$2.50");
  assert.match(formatSignedMoney(5_000_000, 1_000_000, "EUR"), /^\+(€5\.00|5\.00\s?€)$/);
});

test("formatCurrencyAmount respects the provided currency", () => {
  assert.equal(formatCurrencyAmount(5_000_000, "USD"), "$5.00");
  assert.match(formatCurrencyAmount(5_000_000, "EUR"), /€5\.00|5\.00\s?€/);
});
