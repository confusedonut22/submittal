import { hasActiveStakeRound } from "./stakeRound.js";
import { canHydrateRoundState } from "./stakeRoundState.js";

export function hasActiveRound(round) {
  return hasActiveStakeRound(round);
}

export function buildBootstrapState({ auth = null, error = "", localMode = false } = {}) {
  if (localMode) {
    return {
      status: "local",
      authenticated: false,
      localMode: true,
      error: "",
      round: null,
      config: null,
      balance: null,
      resumeBlocked: false,
    };
  }

  if (error) {
    return {
      status: "error",
      authenticated: false,
      localMode: false,
      error,
      round: null,
      config: null,
      balance: null,
      resumeBlocked: false,
    };
  }

  const roundActive = hasActiveRound(auth?.round);
  const resumable = roundActive && canHydrateRoundState(auth?.round?.state);
  const resumeBlocked = roundActive && !resumable;
  return {
    status: resumeBlocked ? "resume-blocked" : resumable ? "resumable" : "ready",
    authenticated: true,
    localMode: false,
    error: "",
    round: auth?.round ?? null,
    config: auth?.config ?? null,
    balance: auth?.balance ?? null,
    resumeBlocked,
  };
}
