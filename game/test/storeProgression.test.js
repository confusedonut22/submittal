import test from "node:test";
import assert from "node:assert/strict";

import { createHandState } from "../src/game/engine.js";
import { findNextActive } from "../src/game/progression.js";

test("findNextActive advances to the next unresolved hand after the current index", () => {
  const hands = [
    { ...createHandState({ bet: 1_000_000 }), done: true },
    { ...createHandState({ bet: 1_000_000 }), done: true },
    { ...createHandState({ bet: 1_000_000 }), done: false },
    { ...createHandState({ bet: 1_000_000 }), done: false },
  ];

  assert.equal(findNextActive(hands, 2), 3);
});

test("findNextActive wraps only if no later unresolved hand exists", () => {
  const hands = [
    { ...createHandState({ bet: 1_000_000 }), done: false },
    { ...createHandState({ bet: 1_000_000 }), done: true },
    { ...createHandState({ bet: 1_000_000 }), done: true },
  ];

  assert.equal(findNextActive(hands, 2), 0);
});

test("findNextActive returns -1 when all hands are complete", () => {
  const hands = [
    { ...createHandState({ bet: 1_000_000 }), done: true },
    { ...createHandState({ bet: 1_000_000 }), done: true },
  ];

  assert.equal(findNextActive(hands, 1), -1);
});
