export const ROUND_STATE_SCHEMA_VERSION = 1;

function buildAllowedActions(phase, activeHand, pendingInsurance) {
  const normalizedPhase = String(phase || "").toUpperCase();
  if (pendingInsurance) return ["insurance-yes", "insurance-no"];
  if (normalizedPhase === "PLAY" && Number.isInteger(activeHand) && activeHand >= 0) {
    return ["hit", "stand", "double"];
  }
  if (normalizedPhase === "RESULT") return ["end-round"];
  return [];
}

export function buildRoundStateSnapshot({
  phase = "",
  dealerHand = [],
  hands = [],
  shoe = [],
  activeHand = -1,
  pending = null,
  message = "",
  lossStreak = 0,
} = {}) {
  return {
    schemaVersion: ROUND_STATE_SCHEMA_VERSION,
    phase,
    activeHand,
    allowedActions: buildAllowedActions(phase, activeHand, pending),
    dealerHand,
    shoe,
    hands: hands.map((hand) => ({
      bet: hand.bet,
      sideBets: hand.sb,
      cards: hand.cards,
      result: hand.result ?? null,
      payout: hand.payout ?? 0,
      done: hand.done === true,
      doubled: hand.doubled === true,
      sideBetResults: hand.sideBetResults ?? [],
    })),
    pendingInsurance: pending
      ? {
          dealerCards: pending.dealerCards ?? [],
          dealerBJ: pending.dealerBJ === true,
          insuranceAmount: pending.insuranceAmount ?? 0,
        }
      : null,
    message,
    lossStreak,
  };
}

export function canHydrateRoundState(state) {
  return Boolean(
    state &&
    typeof state === "object" &&
    (state.schemaVersion == null || state.schemaVersion === ROUND_STATE_SCHEMA_VERSION) &&
    typeof state.phase === "string" &&
    Array.isArray(state.allowedActions ?? []) &&
    Array.isArray(state.dealerHand) &&
    Array.isArray(state.hands) &&
    Array.isArray(state.shoe)
  );
}
