import { get, writable } from "svelte/store";

import { replayMode, sessionQuery } from "./session.js";
import { authenticateSession, fetchReplayEvent } from "./rgsClient.js";
import { applyStakeBootstrap, hydrateStakeRound } from "./store.js";
import { canHydrateRoundState } from "./stakeRoundState.js";
import { buildBootstrapState } from "./sessionBootstrapModel.js";

export const sessionBootstrap = writable({
  status: "idle",
  authenticated: false,
  localMode: true,
  error: "",
  round: null,
  config: null,
  balance: null,
  resumeBlocked: false,
});

let bootstrapPromise = null;

export async function bootstrapStakeSession() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const session = get(sessionQuery);
    const isReplay = get(replayMode);
    if (!session.sessionID || !session.rgsUrl) {
      sessionBootstrap.set(buildBootstrapState({ localMode: true }));
      return null;
    }

    sessionBootstrap.set({
      status: "loading",
      authenticated: false,
      localMode: false,
      error: "",
      round: null,
      config: null,
      balance: null,
      resumeBlocked: false,
    });

    try {
      if (isReplay && session.event) {
        const replay = await fetchReplayEvent(session);
        if (replay?.round?.state && canHydrateRoundState(replay.round.state)) {
          hydrateStakeRound({
            ...replay.round,
            active: false,
          });
        }
        sessionBootstrap.set({
          status: "replay-ready",
          authenticated: false,
          localMode: false,
          error: "",
          round: replay?.round ?? null,
          config: null,
          balance: null,
          resumeBlocked: false,
        });
        return replay;
      }
      const auth = await authenticateSession(session);
      applyStakeBootstrap(auth);
      const resumed = auth?.round?.active && canHydrateRoundState(auth.round?.state)
        ? hydrateStakeRound(auth.round)
        : false;
      sessionBootstrap.set(buildBootstrapState({ auth }));
      if (resumed) {
        sessionBootstrap.update((current) => ({
          ...current,
          status: "resumed",
          resumeBlocked: false,
        }));
      }
      return auth;
    } catch (error) {
      sessionBootstrap.set(buildBootstrapState({
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  })();

  return bootstrapPromise;
}

export function resetSessionBootstrapForTest() {
  bootstrapPromise = null;
  sessionBootstrap.set({
    status: "idle",
    authenticated: false,
    localMode: true,
    error: "",
    round: null,
    config: null,
    balance: null,
    resumeBlocked: false,
  });
}
