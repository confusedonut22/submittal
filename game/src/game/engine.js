// Degen Blackjack — Client-side Game Engine (JS port of math/engine.py)
// Chad Labs / Stake Engine RGS
// In production this logic runs server-side via Stake Engine SDK.
// This JS version is used for the prototype/dev environment.

import {
  SUITS, RANKS, RED_SUITS, RANK_VALUES,
  NUM_DECKS, RESHUFFLE_THRESHOLD, BJ_MULTIPLIER,
} from "./rules.js";

// ─── SHOE ───

export function makeShoe(numDecks = NUM_DECKS, rng = Math.random) {
  const cards = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function drawCard(shoe, rng = Math.random) {
  if (shoe.length < RESHUFFLE_THRESHOLD) {
    const fresh = makeShoe(NUM_DECKS, rng);
    shoe.splice(0, shoe.length, ...fresh);
  }
  return shoe.pop();
}

// ─── HAND EVALUATION ───

export function handValue(cards) {
  let value = 0;
  let aces = 0;
  for (const c of cards) {
    value += RANK_VALUES[c.rank];
    if (c.rank === "A") aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

export function isSoft(cards) {
  let value = 0;
  let aces = 0;
  for (const c of cards) {
    value += RANK_VALUES[c.rank];
    if (c.rank === "A") aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return aces > 0;
}

export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

export function isBust(cards) {
  return handValue(cards) > 21;
}

export function isRed(card) {
  return RED_SUITS.has(card.suit);
}

let nextHandId = 1;

export function resetHandIdSequence() {
  nextHandId = 1;
}

export function createHandId(prefix = "hand") {
  const id = `${prefix}-${nextHandId}`;
  nextHandId += 1;
  return id;
}

export function cardValueForSplit(card) {
  return Math.min(10, RANK_VALUES[card.rank]);
}

export function canSplitHand(hand, rules = {}) {
  if (!hand || hand.done || hand.doubled) return false;
  if ((hand.cards?.length ?? 0) !== 2) return false;
  if (hand.isSplitAcesLocked) return false;
  const [a, b] = hand.cards;
  const allowSameValueSplit = rules.allowSameValueSplit !== false;
  if (a.rank === b.rank) return true;
  if (!allowSameValueSplit) return false;
  return cardValueForSplit(a) === cardValueForSplit(b);
}

export function canDoubleHand(hand, balance = Number.POSITIVE_INFINITY, rules = {}) {
  if (!hand || hand.done || hand.doubled) return false;
  if ((hand.cards?.length ?? 0) !== 2) return false;
  if (balance < hand.bet) return false;
  if (hand.isSplitAcesLocked) return false;
  if (hand.isSplitHand && rules.allowDoubleAfterSplit !== true) return false;
  return true;
}

export function canHitHand(hand) {
  if (!hand || hand.done) return false;
  if (hand.isSplitAcesLocked) return false;
  return !isBust(hand.cards);
}

export function createHandState({
  bet,
  sb = { pp: 0, t: 0 },
  cards = [],
  id = createHandId(),
  parentId = null,
  splitRootId = null,
  splitDepth = 0,
  isSplitHand = false,
  fromSplitAces = false,
  countsAsBlackjack = true,
} = {}) {
  return {
    id,
    parentId,
    splitRootId: splitRootId ?? id,
    splitDepth,
    cards,
    bet,
    baseBet: bet,
    sb,
    result: null,
    message: "",
    payout: 0,
    done: false,
    doubled: false,
    sideBetResults: [],
    stood: false,
    busted: false,
    surrendered: false,
    isSplitHand,
    fromSplitAces,
    isSplitAcesLocked: false,
    countsAsBlackjack,
  };
}

export function resolveHandState(hand, dealerCards, betAmount = hand.bet) {
  const pv = handValue(hand.cards);
  const dv = handValue(dealerCards);
  const pBJ = hand.countsAsBlackjack !== false && isBlackjack(hand.cards);
  const dBJ = isBlackjack(dealerCards);

  if (pBJ && dBJ) return { result: "push", payout: betAmount };
  if (pBJ) return { result: "blackjack", payout: betAmount + Math.floor(betAmount * BJ_MULTIPLIER) };
  if (dBJ) return { result: "lose", payout: 0 };
  if (pv > 21) return { result: "bust", payout: 0 };
  if (dv > 21) return { result: "win", payout: betAmount * 2 };
  if (pv > dv) return { result: "win", payout: betAmount * 2 };
  if (pv === dv) return { result: "push", payout: betAmount };
  return { result: "lose", payout: 0 };
}

export function splitHandAtIndex(hands, handIndex, shoe, balance = Number.POSITIVE_INFINITY, rules = {}) {
  const hand = hands[handIndex];
  if (!canSplitHand(hand, rules)) {
    return { hands, success: false, cost: 0 };
  }
  if (balance < hand.bet) {
    return { hands, success: false, cost: 0 };
  }

  const [firstCard, secondCard] = hand.cards;
  const rootId = hand.splitRootId ?? hand.id;
  const nextDepth = (hand.splitDepth ?? 0) + 1;
  const splittingAces = firstCard.rank === "A" && secondCard.rank === "A";

  const firstHand = createHandState({
    bet: hand.bet,
    sb: { ...hand.sb },
    cards: [firstCard, drawCard(shoe)],
    parentId: hand.id,
    splitRootId: rootId,
    splitDepth: nextDepth,
    isSplitHand: true,
    fromSplitAces: splittingAces,
    countsAsBlackjack: false,
  });
  const secondHand = createHandState({
    bet: hand.bet,
    sb: { pp: 0, t: 0 },
    cards: [secondCard, drawCard(shoe)],
    parentId: hand.id,
    splitRootId: rootId,
    splitDepth: nextDepth,
    isSplitHand: true,
    fromSplitAces: splittingAces,
    countsAsBlackjack: false,
  });

  if (splittingAces) {
    firstHand.isSplitAcesLocked = true;
    secondHand.isSplitAcesLocked = true;
    firstHand.stood = true;
    secondHand.stood = true;
    firstHand.done = true;
    secondHand.done = true;
  }

  const nextHands = [...hands];
  nextHands.splice(handIndex, 1, firstHand, secondHand);
  return {
    hands: nextHands,
    success: true,
    cost: hand.bet,
    createdHands: [firstHand, secondHand],
  };
}

// ─── SIDE BET EVALUATION ───

export function evaluatePerfectPairs(card1, card2, betAmount) {
  if (card1.rank !== card2.rank) return { won: false };
  if (card1.suit === card2.suit) {
    return { won: true, name: "Perfect Pair", multiplier: 25, payout: betAmount * 25 };
  }
  if (isRed(card1) === isRed(card2)) {
    return { won: true, name: "Coloured Pair", multiplier: 12, payout: betAmount * 12 };
  }
  return { won: true, name: "Mixed Pair", multiplier: 6, payout: betAmount * 6 };
}

export function evaluate21Plus3(player1, player2, dealerUp, betAmount) {
  const rankIndices = [player1, player2, dealerUp]
    .map(c => RANKS.indexOf(c.rank))
    .sort((a, b) => a - b);
  const suits = [player1, player2, dealerUp].map(c => c.suit);

  const allSameSuit = suits[0] === suits[1] && suits[1] === suits[2];
  const allSameRank = player1.rank === player2.rank && player2.rank === dealerUp.rank;
  const rankSet = new Set([player1.rank, player2.rank, dealerUp.rank]);
  const isSequential =
    (
      rankIndices[2] - rankIndices[1] === 1 &&
      rankIndices[1] - rankIndices[0] === 1
    ) ||
    (rankSet.size === 3 && rankSet.has("A") && rankSet.has("2") && rankSet.has("3")) ||
    (rankSet.size === 3 && rankSet.has("Q") && rankSet.has("K") && rankSet.has("A"));

  if (allSameRank && allSameSuit)
    return { won: true, name: "Suited Trips",   multiplier: 100, payout: betAmount * 100 };
  if (isSequential && allSameSuit)
    return { won: true, name: "Straight Flush", multiplier: 40,  payout: betAmount * 40  };
  if (allSameRank)
    return { won: true, name: "Three of a Kind",multiplier: 30,  payout: betAmount * 30  };
  if (isSequential)
    return { won: true, name: "Straight",       multiplier: 10,  payout: betAmount * 10  };
  if (allSameSuit)
    return { won: true, name: "Flush",          multiplier: 5,   payout: betAmount * 5   };

  return { won: false };
}

// ─── HAND RESOLUTION ───

/**
 * Resolve a player hand against the dealer.
 * Returns { result, payout } where payout includes original bet on win/push.
 * Results: "win" | "blackjack" | "push" | "lose" | "bust"
 */
export function resolveHand(playerCards, dealerCards, betAmount) {
  return resolveHandState({ cards: playerCards, countsAsBlackjack: true, bet: betAmount }, dealerCards, betAmount);
}

// ─── BASIC STRATEGY (for auto-play) ───

export function basicStrategyAction(playerCards, dealerUpCard) {
  const pv = handValue(playerCards);
  const soft = isSoft(playerCards);
  const canDouble = playerCards.length === 2;
  const dv = RANK_VALUES[dealerUpCard.rank] > 10 ? 10 : RANK_VALUES[dealerUpCard.rank];

  if (pv >= 17) return "stand";
  if (pv <= 8)  return "hit";

  if (soft) {
    if (pv >= 19) return "stand";
    if (pv === 18) return dv >= 9 ? "hit" : "stand";
    return "hit";
  }

  if (pv >= 13 && dv <= 6) return "stand";
  if (pv === 12 && dv >= 4 && dv <= 6) return "stand";
  if (pv === 11 && canDouble) return "double";
  if (pv === 10 && dv <= 9 && canDouble) return "double";
  if (pv === 9 && dv >= 3 && dv <= 6 && canDouble) return "double";
  return "hit";
}
