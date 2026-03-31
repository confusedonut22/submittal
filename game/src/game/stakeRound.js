import { ROUND_STATE_SCHEMA_VERSION } from "./stakeRoundState.js";

function normalizeInteger(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    return normalizeInteger(value.amount ?? value.value ?? value.integer ?? value.betID);
  }
  return null;
}

export function normalizeStakeRound(round) {
  if (!round || typeof round !== "object") return null;
  return {
    betID: normalizeInteger(round.betID),
    amount: normalizeInteger(round.amount),
    payout: normalizeInteger(round.payout),
    payoutMultiplier:
      typeof round.payoutMultiplier === "number" && Number.isFinite(round.payoutMultiplier)
        ? round.payoutMultiplier
        : null,
    active: round.active === true,
    mode: typeof round.mode === "string" ? round.mode : "",
    event: typeof round.event === "string" ? round.event : "",
    state: round.state ?? null,
    raw: round,
  };
}

export function hasActiveStakeRound(round) {
  if (!round || typeof round !== "object") return false;
  if (round.active === true) return true;
  const status = String(round.status ?? round.state ?? "").toLowerCase();
  if (!status) return false;
  return !["closed", "complete", "completed", "ended", "settled", "finished"].includes(status);
}

export function buildStakeEventPayload({ round = null, sequence = 1, event, state = null }) {
  const normalizedRound = normalizeStakeRound(round);
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error("Stake event sequence must be a positive integer");
  }
  return JSON.stringify({
    schemaVersion: ROUND_STATE_SCHEMA_VERSION,
    betID: normalizedRound?.betID ?? null,
    mode: normalizedRound?.mode ?? "BASE",
    sequence,
    event,
    state,
  });
}
