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
  const pv = handValue(playerCards);
  const dv = handValue(dealerCards);
  const pBJ = isBlackjack(playerCards);
  const dBJ = isBlackjack(dealerCards);

  if (pBJ && dBJ) return { result: "push",      payout: betAmount };
  if (pBJ)        return { result: "blackjack",  payout: betAmount + Math.floor(betAmount * BJ_MULTIPLIER) };
  if (dBJ)        return { result: "lose",       payout: 0 };
  if (pv > 21)    return { result: "bust",       payout: 0 };
  if (dv > 21)    return { result: "win",        payout: betAmount * 2 };
  if (pv > dv)    return { result: "win",        payout: betAmount * 2 };
  if (pv === dv)  return { result: "push",       payout: betAmount };
  return           { result: "lose",             payout: 0 };
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
