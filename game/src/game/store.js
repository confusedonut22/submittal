// Degen Blackjack — Svelte game state store
// Chad Labs / Stake Engine RGS

import { writable, derived, get } from "svelte/store";
import {
  makeShoe, drawCard, handValue, isSoft, isBlackjack,
  basicStrategyAction,
} from "./engine.js";
import {
  getInsuranceAmount,
  settleImmediateHands,
  settleDealerHands,
} from "./roundSettlement.js";
import { randomFact, getBadBeat } from "./content.js";
import { playCardSnap, playDealSwoosh } from "./audio.js";
import {
  PHASE, SPEEDS, MONEY_SCALE, STARTING_BALANCE, RANK_VALUES,
} from "./constants.js";
import { replayMode } from "./session.js";
import { sessionQuery } from "./session.js";
import {
  isAllowedStakeBet,
  isAllowedStakeSideBet,
  resolveDefaultStakeBet,
} from "./betConfig.js";
import { endRound, fetchBalance, playRound, postRoundEvent } from "./rgsClient.js";
import { buildStakeEventPayload } from "./stakeRound.js";
import { buildRoundStateSnapshot, canHydrateRoundState } from "./stakeRoundState.js";

// ─── STATE ───

export const phase      = writable(PHASE.INTRO);
export const balance    = writable(STARTING_BALANCE);
export const shoe       = writable(makeShoe());
export const dealerHand = writable([]);
export const hands      = writable([makeHand(MONEY_SCALE)]);
export const numSlots   = writable(1);
export const activeHand = writable(-1);
export const message    = writable("");
export const fact       = writable(randomFact());
export const lossStreak = writable(0);
export const pending    = writable(null); // insurance pending data
export const maxHands   = writable(2);   // 2 mobile, 4 desktop
export const runtimeConfig = writable(null);
export const runtimeJurisdiction = writable(null);
export const runtimeCurrency = writable("USD");
export const sessionStartedAt = writable(null);
export const sessionOpeningBalance = writable(null);
export const rgsRound   = writable(null);
export const rgsStatus  = writable("idle");
export const rgsError   = writable("");
export const rgsEventSeq = writable(0);

// auto-play
export const autoPlay   = writable(false);
export const autoSpeed  = writable("1x");
export const autoCount  = writable(0);
export const autoMax    = writable(50);
export const autoMode   = writable("optimal");
let autoLoopTimer = null;

// UI panels
export const showAuto   = writable(false);
export const showRules  = writable(false);
export const showFacts  = writable(false);

// intro opacity for fade
export const introOp    = writable(1);

// ─── DERIVED ───

export const totalCost = derived(hands, ($hands) =>
  $hands.reduce((t, h) => t + h.bet + h.sb.pp + h.sb.t, 0)
);

export const totalMainBet = derived(hands, ($hands) =>
  $hands.reduce((t, h) => t + h.bet, 0)
);

export const netPosition = derived(
  [balance, sessionOpeningBalance],
  ([$balance, $sessionOpeningBalance]) => {
    if (!Number.isInteger($sessionOpeningBalance)) return 0;
    return $balance - $sessionOpeningBalance;
  }
);

export const canDeal = derived(
  [phase, balance, totalCost, hands, autoPlay, replayMode, runtimeConfig],
  ([$phase, $balance, $totalCost, $hands, $autoPlay, $replayMode, $runtimeConfig]) =>
    ($phase === PHASE.BET || $phase === PHASE.RESULT) &&
    !$autoPlay &&
    !$replayMode &&
    $totalCost > 0 &&
    $totalCost <= $balance &&
    $hands.every(h => isAllowedStakeBet(h.bet, $runtimeConfig))
);

// ─── HELPERS ───

function makeHand(bet = MONEY_SCALE, existingSB = null, isSplit = false) {
  return {
    cards: [],
    bet,
    baseBet: isSplit ? 0 : bet,
    sb: existingSB ?? { pp: 0, t: 0 },
    result: null,
    message: "",
    payout: 0,
    done: false,
    doubled: false,
    sideBetResults: [],
    isSplit,
    isAceSplit: false,
  };
}

function getSp() {
  return SPEEDS[get(autoSpeed)];
}

function conservativeStrategyAction(playerCards, dealerUpCard) {
  const total = handValue(playerCards);
  const soft = isSoft(playerCards);
  const dealerValue = dealerUpCard ? Math.min(10, handValue([dealerUpCard])) : 10;

  if (soft) {
    if (total >= 19) return "stand";
    if (total === 18) return dealerValue >= 9 ? "hit" : "stand";
    return total <= 16 ? "hit" : "stand";
  }

  if (total >= 17) return "stand";
  if (total >= 13 && dealerValue <= 6) return "stand";
  if (total === 12 && dealerValue >= 4 && dealerValue <= 6) return "stand";
  if (total <= 11) return "hit";
  return dealerValue >= 7 ? "hit" : "stand";
}

function highStakesStrategyAction(playerCards, dealerUpCard) {
  const baseAction = basicStrategyAction(playerCards, dealerUpCard);
  const total = handValue(playerCards);
  const soft = isSoft(playerCards);
  const canDouble = playerCards.length === 2;
  const dealerValue = dealerUpCard ? Math.min(10, handValue([dealerUpCard])) : 10;

  if (canDouble) {
    if (!soft && total === 11) return "double";
    if (!soft && total === 10 && dealerValue <= 10) return "double";
    if (!soft && total === 9 && dealerValue >= 2 && dealerValue <= 7) return "double";
    if (soft && total >= 17 && total <= 18 && dealerValue >= 3 && dealerValue <= 6) return "double";
  }

  if (!soft && total === 16 && dealerValue >= 9) return "hit";
  if (!soft && total === 15 && dealerValue >= 10) return "hit";

  return baseAction;
}

function getAutoStrategyAction(playerCards, dealerUpCard) {
  const mode = get(autoMode);
  if (mode === "conservative") return conservativeStrategyAction(playerCards, dealerUpCard);
  if (mode === "high-stakes") return highStakesStrategyAction(playerCards, dealerUpCard);
  return basicStrategyAction(playerCards, dealerUpCard);
}

function clearAutoLoop() {
  if (autoLoopTimer) {
    clearTimeout(autoLoopTimer);
    autoLoopTimer = null;
  }
}

function scheduleAutoLoop(delay = 0) {
  clearAutoLoop();
  if (!get(autoPlay)) return;
  autoLoopTimer = setTimeout(async () => {
    autoLoopTimer = null;
    await runAutoLoop();
  }, delay);
}

async function runAutoLoop() {
  if (!get(autoPlay)) return;

  const $phase = get(phase);
  const $actH = get(activeHand);
  const $hands = get(hands);
  const $count = get(autoCount);
  const $max = get(autoMax);
  const sp = getSp();

  if ($phase === PHASE.BET) {
    if ($count >= $max) {
      autoPlay.set(false);
      return;
    }
    autoCount.update((n) => n + 1);
    await deal();
    if (get(autoPlay)) scheduleAutoLoop(sp.deal);
    return;
  }

  if ($phase === PHASE.INS) {
    takeInsurance(false);
    if (get(autoPlay)) scheduleAutoLoop(sp.draw);
    return;
  }

  if ($phase === PHASE.PLAY && $actH >= 0) {
    const h = $hands[$actH];
    if (!h || h.done) {
      scheduleAutoLoop(sp.draw);
      return;
    }
    const action = getAutoStrategyAction(h.cards, get(dealerHand)[0]);
    if (action === "double" && h.cards.length === 2 && get(balance) >= h.bet) {
      doubleDown();
      if (get(autoPlay)) scheduleAutoLoop(sp.draw);
      return;
    }
    if (action === "stand") {
      stand();
      if (get(autoPlay)) scheduleAutoLoop(sp.draw);
      return;
    }
    hit();
    if (get(autoPlay)) scheduleAutoLoop(sp.draw);
    return;
  }

  if ($phase === PHASE.RESULT) {
    newRound();
    if (get(autoPlay)) scheduleAutoLoop(sp.between);
    return;
  }

  if ($phase === PHASE.DEAL || $phase === PHASE.DEALER) {
    scheduleAutoLoop(sp.draw);
    return;
  }

  scheduleAutoLoop(sp.draw);
}

function findNextActive(hs) {
  for (let i = hs.length - 1; i >= 0; i--) {
    if (!hs[i].done) return i;
  }
  return -1;
}

function hasStakeSession() {
  const session = get(sessionQuery);
  return Boolean(session.sessionID && session.rgsUrl);
}

export async function refreshStakeBalance() {
  if (!hasStakeSession()) return null;
  const session = get(sessionQuery);
  try {
    const response = await fetchBalance(session);
    if (response?.balance != null) {
      balance.set(response.balance);
    }
    if (response?.currency) {
      runtimeCurrency.set(response.currency);
    }
    return response;
  } catch (error) {
    rgsError.set(error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function requestPlay(totalRoundDebit) {
  if (!hasStakeSession()) return null;
  const session = get(sessionQuery);
  const handConfigs = get(hands).map((hand) => ({
    bet: hand.bet,
    sideBets: hand.sb,
  }));
  rgsStatus.set("playing");
  rgsError.set("");
  const response = await playRound(session, {
    amount: totalRoundDebit,
    mode: "BASE",
    handConfigs,
  });
  if (response.balance != null) balance.set(response.balance);
  if (response?.currency) runtimeCurrency.set(response.currency);
  rgsRound.set(response.round ?? null);
  rgsEventSeq.set(0);
  rgsStatus.set(response.round?.active ? "round-active" : "ready");
  return response;
}

async function emitRoundEvent(event) {
  if (!hasStakeSession()) return null;
  const session = get(sessionQuery);
  try {
    const sequence = get(rgsEventSeq) + 1;
    const state = buildRoundStateSnapshot({
      phase: get(phase),
      dealerHand: get(dealerHand),
      hands: get(hands),
      shoe: get(shoe),
      activeHand: get(activeHand),
      pending: get(pending),
      message: get(message),
      lossStreak: get(lossStreak),
    });
    const payload = buildStakeEventPayload({
      round: get(rgsRound),
      sequence,
      event,
      state,
    });
    const response = await postRoundEvent(session, { event: payload });
    rgsEventSeq.set(sequence);
    if (response?.parsedEvent?.state && canHydrateRoundState(response.parsedEvent.state)) {
      hydrateStakeRound({
        ...(get(rgsRound) ?? {}),
        state: response.parsedEvent.state,
        active: response.parsedEvent.active ?? get(rgsRound)?.active ?? true,
      });
    }
    return response;
  } catch (error) {
    rgsStatus.set("event-error");
    rgsError.set(error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function requestEndRound() {
  if (!hasStakeSession()) return null;
  const session = get(sessionQuery);
  try {
    const response = await endRound(session);
    if (response.balance != null) balance.set(response.balance);
    if (response?.currency) runtimeCurrency.set(response.currency);
    rgsRound.set(null);
    rgsEventSeq.set(0);
    rgsStatus.set("ready");
    return response;
  } catch (error) {
    rgsStatus.set("end-round-error");
    rgsError.set(error instanceof Error ? error.message : String(error));
    return null;
  }
}

export function applyStakeBootstrap({ balance: authenticatedBalance, currency, config, jurisdictionFlags }) {
  if (Number.isInteger(authenticatedBalance) && authenticatedBalance >= 0) {
    balance.set(authenticatedBalance);
    sessionOpeningBalance.set(authenticatedBalance);
    sessionStartedAt.set(Date.now());
  }
  if (currency) {
    runtimeCurrency.set(currency);
  }

  runtimeConfig.set(config ?? null);
  runtimeJurisdiction.set(jurisdictionFlags ?? null);
  if (jurisdictionFlags?.disabledAutoplay) {
    autoPlay.set(false);
    showAuto.set(false);
  }

  const defaultBet = resolveDefaultStakeBet(config, MONEY_SCALE);
  hands.update((currentHands) => currentHands.map((hand) => {
    const nextBet = isAllowedStakeBet(hand.bet, config) ? hand.bet : defaultBet;
    const nextSb = {
      pp: isAllowedStakeSideBet(hand.sb.pp, "pp", config) ? hand.sb.pp : 0,
      t: isAllowedStakeSideBet(hand.sb.t, "t", config) ? hand.sb.t : 0,
    };
    return {
      ...hand,
      bet: nextBet,
      baseBet: nextBet,
      sb: nextSb,
    };
  }));
}

autoPlay.subscribe((enabled) => {
  if (!enabled) {
    clearAutoLoop();
    return;
  }
  scheduleAutoLoop(0);
});

export function hydrateStakeRound(round) {
  const state = round?.state;
  if (!canHydrateRoundState(state)) return false;

  const restoredHands = state.hands.map((hand) => ({
    cards: hand.cards ?? [],
    bet: hand.bet ?? MONEY_SCALE,
    baseBet: hand.baseBet ?? hand.bet ?? MONEY_SCALE,
    sb: hand.sideBets ?? { pp: 0, t: 0 },
    result: hand.result ?? null,
    message:
      hand.result === "win" ? "Win"
      : hand.result === "blackjack" ? "Blackjack"
      : hand.result === "push" ? "Push"
      : hand.result === "lose" ? "Lose"
      : hand.result === "bust" ? "Bust"
      : "",
    payout: hand.payout ?? 0,
    done: hand.done === true,
    doubled: hand.doubled === true,
    sideBetResults: hand.sideBetResults ?? [],
  }));

  const restoredPending = state.pendingInsurance
    ? {
        dealerCards: state.pendingInsurance.dealerCards ?? state.dealerHand ?? [],
        freshHands: restoredHands.map((hand) => ({ ...hand })),
        dealerBJ: state.pendingInsurance.dealerBJ === true,
        insuranceAmount: state.pendingInsurance.insuranceAmount ?? 0,
      }
    : null;

  shoe.set(state.shoe ?? makeShoe());
  dealerHand.set(state.dealerHand ?? []);
  hands.set(restoredHands);
  numSlots.set(Math.max(1, restoredHands.length));
  activeHand.set(Number.isInteger(state.activeHand) ? state.activeHand : findNextActive(restoredHands));
  pending.set(restoredPending);
  message.set(state.message ?? "");
  lossStreak.set(Number.isInteger(state.lossStreak) ? state.lossStreak : 0);
  showAuto.set(false);
  rgsRound.set(round ?? null);
  rgsStatus.set(round?.active ? "round-active" : "ready");

  const phaseValue = String(state.phase || "").toUpperCase();
  switch (phaseValue) {
    case PHASE.BET:
    case PHASE.DEAL:
    case PHASE.PLAY:
    case PHASE.DEALER:
    case PHASE.RESULT:
    case PHASE.INS:
      phase.set(phaseValue);
      break;
    default:
      phase.set(PHASE.PLAY);
      break;
  }

  return true;
}

// ─── ACTIONS ───

export function startIntro() {
  if (get(phase) !== PHASE.INTRO) return;
  setTimeout(() => introOp.set(0), 2500);
  setTimeout(() => {
    if (get(phase) === PHASE.INTRO) phase.set(PHASE.BET);
  }, 3200);
}

export function addSlot() {
  if (get(replayMode)) return;
  const $numSlots = get(numSlots);
  const $maxHands = get(maxHands);
  const $phase    = get(phase);
  if ($numSlots >= $maxHands || ($phase !== PHASE.BET && $phase !== PHASE.RESULT)) return;
  numSlots.update(n => n + 1);
  hands.update(hs => {
    const baseBet = hs[0]?.bet ?? MONEY_SCALE;
    return [...hs, makeHand(baseBet)];
  });
}

export function removeSlot(idx) {
  if (get(replayMode)) return;
  if (get(numSlots) <= 1 || (get(phase) !== PHASE.BET && get(phase) !== PHASE.RESULT)) return;
  numSlots.update(n => n - 1);
  hands.update(hs => hs.filter((_, i) => i !== idx));
}

export function addSideBetChip(idx, key, value) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  const config = get(runtimeConfig);
  hands.update(hs => hs.map((h, i) =>
    i === idx
      ? (() => {
          const nextAmount = h.sb[key] + value;
          if (!isAllowedStakeSideBet(nextAmount, key, config)) return h;
          return { ...h, sb: { ...h.sb, [key]: nextAmount } };
        })()
      : h
  ));
}

export function clearSideBet(idx, key) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  hands.update(hs => hs.map((h, i) =>
    i === idx ? { ...h, sb: { ...h.sb, [key]: 0 } } : h
  ));
}

export function setSideBetAmount(idx, key, amount) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  const config = get(runtimeConfig);
  hands.update(hs => hs.map((h, i) => {
    if (i !== idx) return h;
    if (amount <= 0) return { ...h, sb: { ...h.sb, [key]: 0 } };
    if (!isAllowedStakeSideBet(amount, key, config)) return h;
    return { ...h, sb: { ...h.sb, [key]: amount } };
  }));
}

export function addChip(idx, value) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  hands.update(hs => hs.map((h, i) =>
    i === idx ? { ...h, bet: h.bet + value } : h
  ));
}

export function setBetLevel(idx, value) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  const config = get(runtimeConfig);
  if (!isAllowedStakeBet(value, config)) return;
  hands.update(hs => hs.map((h, i) =>
    i === idx ? { ...h, bet: value, baseBet: value } : h
  ));
}

export function adjustBetByFactor(idx, factor) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  const config = get(runtimeConfig);
  hands.update((hs) => hs.map((h, i) => {
    if (i !== idx) return h;

    const rawNext = Math.max(1, Math.round(h.bet * factor));

    let nextBet = rawNext;
    if (config?.betLevels?.length) {
      if (factor < 1) {
        nextBet = [...config.betLevels]
          .filter((level) => level <= rawNext)
          .at(-1) ?? config.betLevels[0];
      } else {
        nextBet = config.betLevels.find((level) => level >= rawNext) ?? config.betLevels.at(-1);
      }
    } else if (config?.stepBet && config.stepBet > 0) {
      const minBet = config.minBet ?? config.stepBet;
      const steps = Math.round((rawNext - minBet) / config.stepBet);
      nextBet = minBet + (steps * config.stepBet);
    }

    if (config?.minBet != null) nextBet = Math.max(config.minBet, nextBet);
    if (config?.maxBet != null) nextBet = Math.min(config.maxBet, nextBet);

    if (!isAllowedStakeBet(nextBet, config)) return h;
    return { ...h, bet: nextBet, baseBet: nextBet };
  }));
}

export function clearBet(idx) {
  if (get(replayMode)) return;
  if (get(phase) !== PHASE.BET) return;
  hands.update(hs => hs.map((h, i) =>
    i === idx ? { ...h, bet: 0, baseBet: 0 } : h
  ));
}

export function newRound() {
  if (get(replayMode)) return;
  phase.set(PHASE.BET);
  dealerHand.set([]);
  message.set("");
  pending.set(null);
  activeHand.set(0);
  fact.set(randomFact());
  rgsError.set("");
  rgsEventSeq.set(0);
  hands.update(hs => {
    // Remove ephemeral split hands; keep only original hands
    const originals = hs.filter(h => !h.isSplit);
    const base = originals.length > 0 ? originals : hs.slice(0, 1);
    const fresh = base.map(h => makeHand(h.baseBet ?? h.bet, { ...h.sb }));
    // Sync numSlots to the number of original hands
    numSlots.set(fresh.length);
    return fresh;
  });
}

export async function deal() {
  if (get(replayMode)) return;
  const $hands   = get(hands);
  const $balance = get(balance);
  const $tc      = get(totalCost);
  const $mt      = get(totalMainBet);
  const $auto    = get(autoPlay);
  const sp       = getSp();

  if ($tc > $balance || $tc <= 0 || $hands.some(h => h.bet <= 0)) return;

  if (hasStakeSession()) {
    try {
      const response = await requestPlay($tc);
      playDealSwoosh();
      if (response?.round?.state && canHydrateRoundState(response.round.state)) {
        hydrateStakeRound(response.round);
        if (get(phase) === PHASE.RESULT) {
          requestEndRound();
        }
        return;
      }
    } catch (error) {
      rgsStatus.set("play-error");
      rgsError.set(error instanceof Error ? error.message : String(error));
      return;
    }
  }

  playDealSwoosh();
  if (!hasStakeSession()) {
    balance.update(b => b - $tc);
  }
  message.set("");
  pending.set(null);
  phase.set(PHASE.DEAL);

  // Reset hands
  const freshHands = $hands.map(h => ({ ...makeHand(h.bet, { ...h.sb }), cards: [] }));

  // Draw cards from shoe
  const $shoe = get(shoe);
  const dealerCards = [drawCard($shoe), drawCard($shoe)];
  for (const h of freshHands) {
    h.cards = [drawCard($shoe), drawCard($shoe)];
  }
  shoe.set($shoe);

  setTimeout(() => {
    dealerHand.set(dealerCards);
    hands.set(freshHands);
    emitRoundEvent({
      type: "initialDeal",
      dealerUp: dealerCards[0],
      playerHands: freshHands.map((hand) => ({
        bet: hand.bet,
        sideBets: hand.sb,
        cards: hand.cards,
      })),
    });

    const dealerBJ = isBlackjack(dealerCards);
    const insuranceAmount = getInsuranceAmount($mt);

    // Insurance prompt
    if (dealerCards[0].rank === "A" && !$auto) {
      pending.set({ dealerCards, freshHands, dealerBJ, insuranceAmount });
      phase.set(PHASE.INS);
    } else {
      resolveInitial(dealerCards, freshHands, false, insuranceAmount);
    }
  }, $auto ? sp.deal : 350);
}

export function takeInsurance(take, customAmount = null) {
  if (get(replayMode)) return;
  const $pend = get(pending);
  if (!$pend) return;
  const effectiveAmount = customAmount !== null ? customAmount : $pend.insuranceAmount;
  if (hasStakeSession()) {
    pending.set(null);
    emitRoundEvent({
      type: "insuranceDecision",
      accepted: Boolean(take),
      amount: take ? effectiveAmount : 0,
    }).then(() => {
      if (get(phase) === PHASE.RESULT) requestEndRound();
    });
    return;
  }
  pending.set(null);
  const accepted = take && effectiveAmount > 0 && get(balance) >= effectiveAmount;
  if (accepted) {
    balance.update(b => b - effectiveAmount);
  }
  emitRoundEvent({
    type: "insuranceDecision",
    accepted,
    amount: accepted ? effectiveAmount : 0,
  });
  resolveInitial(
    $pend.dealerCards,
    $pend.freshHands,
    accepted,
    effectiveAmount
  );
}

function resolveInitial(dealerCards, hs, tookInsurance, insuranceAmount) {
  const {
    hands: updated,
    sideBetPayout,
    immediatePayout,
    dealerBJ,
  } = settleImmediateHands(hs, dealerCards);

  if (tookInsurance && dealerBJ && insuranceAmount > 0) {
    balance.update(b => b + (insuranceAmount * 3));
  }
  if (sideBetPayout > 0) balance.update(b => b + sideBetPayout);
  if (immediatePayout > 0) balance.update(b => b + immediatePayout);

  const sideBetEvents = updated
    .map((hand, handIndex) => ({ handIndex, results: hand.sideBetResults ?? [] }))
    .filter((entry) => entry.results.length > 0);
  if (sideBetEvents.length > 0) {
    emitRoundEvent({
      type: "sideBetsResolved",
      hands: sideBetEvents,
      totalPayout: sideBetPayout,
    });
  }

  emitRoundEvent({
    type: "initialResolution",
    dealerBlackjack: dealerBJ,
    insuranceTaken: tookInsurance,
    insuranceAmount: tookInsurance ? insuranceAmount : 0,
    immediatePayout,
    hands: updated.map((hand, handIndex) => ({
      handIndex,
      result: hand.result,
      payout: hand.payout,
      done: hand.done,
    })),
  });

  hands.set(updated);

  const nx = findNextActive(updated);
  if (nx >= 0) {
    activeHand.set(nx);
    phase.set(PHASE.PLAY);
  } else {
    finishRound(updated, handValue(dealerCards));
  }
}

export function hit() {
  if (get(replayMode)) return;
  const $actH = get(activeHand);
  if (hasStakeSession()) {
    playCardSnap();
    emitRoundEvent({
      type: "playerAction",
      action: "hit",
      handIndex: $actH,
    }).then(() => {
      if (get(phase) === PHASE.RESULT) requestEndRound();
    });
    return;
  }
  playCardSnap();
  const $shoe = get(shoe);
  const card = drawCard($shoe);
  shoe.set($shoe);
  emitRoundEvent({
    type: "playerAction",
    action: "hit",
    handIndex: $actH,
    card,
  });

  hands.update(hs => {
    const updated = [...hs];
    const h = { ...updated[$actH], cards: [...updated[$actH].cards, card] };
    const v = handValue(h.cards);
    if (v > 21) { h.result = "bust"; h.message = "Bust"; h.done = true; }
    else if (v === 21) { h.done = true; }
    updated[$actH] = h;

    if (h.done) advanceOrDealer(updated, $actH);
    return updated;
  });
}

export function stand() {
  if (get(replayMode)) return;
  const $actH = get(activeHand);
  if (hasStakeSession()) {
    emitRoundEvent({
      type: "playerAction",
      action: "stand",
      handIndex: $actH,
    }).then(() => {
      if (get(phase) === PHASE.RESULT) requestEndRound();
    });
    return;
  }
  emitRoundEvent({
    type: "playerAction",
    action: "stand",
    handIndex: $actH,
  });
  hands.update(hs => {
    const updated = [...hs];
    updated[$actH] = { ...updated[$actH], done: true };
    advanceOrDealer(updated, $actH);
    return updated;
  });
}

export function doubleDown() {
  if (get(replayMode)) return;
  const $actH = get(activeHand);
  const $hands = get(hands);
  const h = $hands[$actH];
  if (get(balance) < h.bet) return;
  if (hasStakeSession()) {
    playCardSnap();
    emitRoundEvent({
      type: "playerAction",
      action: "double",
      handIndex: $actH,
    }).then(() => {
      if (get(phase) === PHASE.RESULT) requestEndRound();
    });
    return;
  }

  playCardSnap();
  balance.update(b => b - h.bet);
  const $shoe = get(shoe);
  const card = drawCard($shoe);
  shoe.set($shoe);
  emitRoundEvent({
    type: "playerAction",
    action: "double",
    handIndex: $actH,
    card,
  });

  hands.update(hs => {
    const updated = [...hs];
    const nh = {
      ...updated[$actH],
      cards: [...updated[$actH].cards, card],
      bet: updated[$actH].bet * 2,
      done: true,
      doubled: true,
    };
    if (handValue(nh.cards) > 21) { nh.result = "bust"; nh.message = "Bust"; }
    updated[$actH] = nh;
    advanceOrDealer(updated, $actH);
    return updated;
  });
}

export function split() {
  if (get(replayMode)) return;
  const $actH    = get(activeHand);
  const $hands   = get(hands);
  const $balance = get(balance);
  const $numSlots = get(numSlots);
  const $maxHands = get(maxHands);

  const h = $hands[$actH];
  if (!h || h.cards.length !== 2) return;
  if ($numSlots >= $maxHands) return;
  if ($balance < h.bet) return;

  if (h.cards[0].rank !== h.cards[1].rank) return;

  const isAceSplit = h.cards[0].rank === "A";

  // Deduct the matching bet for the second split hand
  balance.update(b => b - h.bet);

  // Draw one card for each new hand
  const $shoe = get(shoe);
  const draw1 = drawCard($shoe);
  const draw2 = drawCard($shoe);
  shoe.set($shoe);

  playCardSnap();

  // Build two replacement hands
  const hand1 = {
    ...makeHand(h.bet, { pp: 0, t: 0 }, true),
    cards: [h.cards[0], draw1],
    isAceSplit,
    done: isAceSplit,
    message: isAceSplit && handValue([h.cards[0], draw1]) === 21 ? "21" : "",
  };
  const hand2 = {
    ...makeHand(h.bet, { pp: 0, t: 0 }, true),
    cards: [h.cards[1], draw2],
    isAceSplit,
    done: isAceSplit,
    message: isAceSplit && handValue([h.cards[1], draw2]) === 21 ? "21" : "",
  };

  emitRoundEvent({
    type: "playerAction",
    action: "split",
    handIndex: $actH,
    cards: [draw1, draw2],
  });

  hands.update(hs => {
    const updated = [...hs];
    updated[$actH] = hand1;
    updated.splice($actH + 1, 0, hand2);
    return updated;
  });

  numSlots.update(n => n + 1);

  if (isAceSplit) {
    // Both hands are immediately done — go to dealer
    setTimeout(() => runDealer(get(hands)), 300);
  } else {
    // Let findNextActive pick the first playable hand (rightmost)
    const updated = get(hands);
    const nx = findNextActive(updated);
    if (nx >= 0) {
      activeHand.set(nx);
    } else {
      setTimeout(() => runDealer(get(hands)), 200);
    }
  }
}

function advanceOrDealer(updatedHands, currentIdx) {
  const nx = findNextActive(updatedHands);
  if (nx >= 0) {
    setTimeout(() => activeHand.set(nx), 150);
  } else {
    // Read latest hands from store at time of execution so doubled bets are included
    setTimeout(() => runDealer(get(hands)), 200);
  }
}

function runDealer(playerHands) {
  activeHand.set(-1);
  phase.set(PHASE.DEALER);
  const sp = getSp();

  let d = [...get(dealerHand)];

  function step() {
    if (handValue(d) < 17) {
      const $shoe = get(shoe);
      d = [...d, drawCard($shoe)];
      shoe.set($shoe);
      playCardSnap();
      dealerHand.set([...d]);
      setTimeout(step, get(autoPlay) ? sp.draw : 400);
    } else {
      const dv = handValue(d);
      setTimeout(() => {
        const { hands: fin, payout: totalPayout } = settleDealerHands(playerHands, d);
        if (totalPayout > 0) balance.update(b => b + totalPayout);
        hands.set(fin);
        emitRoundEvent({
          type: "dealerFinal",
          cards: d,
          value: dv,
        });
        finishRound(fin, dv);
      }, get(autoPlay) ? sp.result : 500);
    }
  }

  setTimeout(step, get(autoPlay) ? sp.draw : 250);
}

function finishRound(hs, dealerVal) {
  const anyLoss = hs.some(h => h.result === "lose" || h.result === "bust");
  const anyWin  = hs.some(h => h.result === "win"  || h.result === "blackjack");

  if (anyLoss && !anyWin) lossStreak.update(s => s + 1);
  else if (anyWin)        lossStreak.set(0);

  const $streak = get(lossStreak);
  const h0 = hs[0];
  if (h0 && (h0.result === "lose" || h0.result === "bust")) {
    const pv = h0.cards.length ? handValue(h0.cards) : 0;
    const bb = getBadBeat(pv, dealerVal, h0.result === "bust", h0.doubled && h0.result === "bust", $streak);
    if (bb) { message.set(bb); phase.set(PHASE.RESULT); return; }
  }

  const wins   = hs.filter(h => h.result === "win" || h.result === "blackjack").length;
  const losses = hs.filter(h => h.result === "lose" || h.result === "bust").length;
  if (wins > 0 && losses === 0)      message.set("You Win!");
  else if (losses > 0 && wins === 0) message.set("Dealer Wins");
  else                               message.set("");

  phase.set(PHASE.RESULT);
  emitRoundEvent({
    type: "roundSettlement",
    dealerValue: dealerVal,
    hands: hs.map((hand) => ({
      result: hand.result,
      payout: hand.payout,
      bet: hand.bet,
      doubled: hand.doubled,
      sideBetResults: hand.sideBetResults,
    })),
  });
  requestEndRound();
}

// ─── AUTO-PLAY TICK ───
// Legacy shim for UI imports. Auto-play is now store-driven.

export function autoTick() {
  if (get(autoPlay)) scheduleAutoLoop(0);
  return autoLoopTimer;
}
