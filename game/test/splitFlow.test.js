import test from "node:test";
import assert from "node:assert/strict";

import { createHandState, splitHandAtIndex, resolveHandState } from "../src/game/engine.js";

const makeCard = (rank, suit) => ({ rank, suit });

function riggedShoe(cards) {
  return [...cards].reverse();
}

test("splitHandAtIndex duplicates the main wager and creates two child hands", () => {
  const hands = [
    createHandState({
      bet: 1_000_000,
      cards: [makeCard("8", "hearts"), makeCard("8", "spades")],
    }),
  ];
  const shoe = riggedShoe([makeCard("3", "clubs"), makeCard("K", "diamonds")]);

  const result = splitHandAtIndex(hands, 0, shoe, Number.POSITIVE_INFINITY);

  assert.equal(result.success, true);
  assert.equal(result.cost, 1_000_000);
  assert.equal(result.hands.length, 2);
  assert.equal(result.createdHands.length, 2);
  assert.equal(result.hands[0].cards.length, 2);
  assert.equal(result.hands[1].cards.length, 2);
  assert.equal(result.hands[0].isSplitHand, true);
  assert.equal(result.hands[1].isSplitHand, true);
});

test("split aces are locked after receiving one card each", () => {
  const hands = [
    createHandState({
      bet: 1_000_000,
      cards: [makeCard("A", "hearts"), makeCard("A", "spades")],
    }),
  ];
  const shoe = riggedShoe([makeCard("9", "clubs"), makeCard("K", "diamonds")]);

  const result = splitHandAtIndex(hands, 0, shoe, Number.POSITIVE_INFINITY);

  assert.equal(result.success, true);
  assert.equal(result.createdHands[0].isSplitAcesLocked, true);
  assert.equal(result.createdHands[1].isSplitAcesLocked, true);
  assert.equal(result.createdHands[0].done, true);
  assert.equal(result.createdHands[1].done, true);
});

test("split hand blackjack-shaped 21 resolves as a regular win", () => {
  const hand = createHandState({
    bet: 1_000_000,
    cards: [makeCard("A", "hearts"), makeCard("K", "clubs")],
    isSplitHand: true,
    countsAsBlackjack: false,
  });

  const result = resolveHandState(hand, [makeCard("10", "spades"), makeCard("7", "diamonds")]);

  assert.equal(result.result, "win");
  assert.equal(result.payout, 2_000_000);
});
