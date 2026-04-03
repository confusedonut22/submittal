import { evaluate21Plus3, evaluatePerfectPairs, handValue, isBlackjack, resolveHand } from "./engine.js";

export function getInsuranceAmount(totalMainBet) {
  return Math.floor(totalMainBet / 2);
}

function sideBetResultsForHand(hand, dealerUpCard) {
  const results = [];
  const p1 = hand.cards[0];
  const p2 = hand.cards[1];

  if (hand.sb?.t > 0) {
    results.push({
      type: "21+3",
      ...evaluate21Plus3(p1, p2, dealerUpCard, hand.sb.t),
    });
  }

  if (hand.sb?.pp > 0) {
    results.push({
      type: "PP",
      ...evaluatePerfectPairs(p1, p2, hand.sb.pp),
    });
  }

  return results;
}

export function settleImmediateHands(hands, dealerCards) {
  const dealerUpCard = dealerCards[0];
  const dealerBJ = isBlackjack(dealerCards);

  let sideBetPayout = 0;
  let immediatePayout = 0;

  const settledHands = hands.map((hand) => {
    const sideBetResults = sideBetResultsForHand(hand, dealerUpCard);
    for (const result of sideBetResults) {
      if (result.won) sideBetPayout += result.payout;
    }

    const pv = handValue(hand.cards);
    let result = hand.result;
    let message = hand.message;
    let payout = hand.payout;
    let done = hand.done;

    if (!done) {
      if (pv === 21 && dealerBJ) {
        result = "push";
        message = "Push";
        payout = hand.bet;
        done = true;
      } else if (pv === 21) {
        result = "blackjack";
        message = "Blackjack";
        payout = hand.bet + Math.floor(hand.bet * 1.5);
        done = true;
      } else if (dealerBJ) {
        result = "lose";
        message = "Dealer BJ";
        payout = 0;
        done = true;
      }
    }

    if (payout > 0) immediatePayout += payout;

    return {
      ...hand,
      sideBetResults,
      result,
      message,
      payout,
      done,
    };
  });

  return {
    hands: settledHands,
    dealerBJ,
    sideBetPayout,
    immediatePayout,
  };
}

export function settleDealerHands(hands, dealerCards) {
  let payout = 0;

  const settledHands = hands.map((hand) => {
    if (hand.result) return hand;

    const { result, payout: handPayout } = resolveHand(hand.cards, dealerCards, hand.bet);
    if (handPayout > 0) payout += handPayout;

    return {
      ...hand,
      result,
      message:
        result === "win" ? "Win"
        : result === "blackjack" ? "Blackjack"
        : result === "push" ? "Push"
        : "Lose",
      payout: handPayout,
      done: true,
    };
  });

  return {
    hands: settledHands,
    payout,
  };
}
