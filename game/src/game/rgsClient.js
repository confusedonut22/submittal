import { normalizeStakeConfig } from "./betConfig.js";
import { normalizeStakeRound } from "./stakeRound.js";
import { normalizeRgsUrl } from "./session.js";

export function joinRgsUrl(baseUrl, path) {
  const base = normalizeRgsUrl(baseUrl);
  if (!base) throw new Error("Missing rgs_url");
  const tail = String(path || "").replace(/^\/+/, "");
  return new URL(tail, `${base}/`).toString();
}

function normalizeInteger(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    return normalizeInteger(value.amount ?? value.value ?? value.integer);
  }
  return null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return Boolean(value);
}

function normalizeJurisdictionFlags(payload) {
  const source = payload?.jurisdictionFlags ?? payload?.config?.jurisdiction ?? {};
  return {
    socialCasino: normalizeBoolean(source.socialCasino),
    disabledFullscreen: normalizeBoolean(source.disabledFullscreen),
    disabledTurbo: normalizeBoolean(source.disabledTurbo),
    disabledSuperTurbo: normalizeBoolean(source.disabledSuperTurbo),
    disabledAutoplay: normalizeBoolean(source.disabledAutoplay),
    disabledSlamstop: normalizeBoolean(source.disabledSlamstop),
    disabledSpacebar: normalizeBoolean(source.disabledSpacebar),
    disabledBuyFeature: normalizeBoolean(source.disabledBuyFeature),
    displayNetPosition: normalizeBoolean(source.displayNetPosition),
    displayRTP: source.displayRTP == null ? true : normalizeBoolean(source.displayRTP),
    displaySessionTimer: normalizeBoolean(source.displaySessionTimer),
    minimumRoundDuration: normalizeInteger(source.minimumRoundDuration) ?? 0,
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function emitWindowEvent(name, detail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function normalizeAuthenticateResponse(payload) {
  const body = payload?.data ?? payload ?? {};
  const normalizedRound = normalizeStakeRound(body.round);
  if (body.balance != null) emitWindowEvent("balanceUpdate", body.balance);
  emitWindowEvent("roundActive", { active: normalizedRound?.active === true });
  return {
    balance: normalizeInteger(body.balance),
    currency: String(body?.balance?.currency || "").trim().toUpperCase() || "USD",
    config: normalizeStakeConfig(body.config ?? {}),
    jurisdictionFlags: normalizeJurisdictionFlags(body),
    round: normalizedRound,
    raw: body,
  };
}

export async function authenticateSession(session) {
  const payload = await postJson(
    joinRgsUrl(session.rgsUrl, "/wallet/authenticate"),
    {
      sessionID: session.sessionID,
      lang: session.lang || undefined,
      device: session.device || undefined,
      game: session.game || undefined,
      social: session.social || undefined,
    },
  );
  return normalizeAuthenticateResponse(payload);
}

export async function fetchBalance(session) {
  const body = await postJson(
    joinRgsUrl(session.rgsUrl, "/wallet/balance"),
    {
      sessionID: session.sessionID,
    },
  );
  if (body?.balance != null) emitWindowEvent("balanceUpdate", body.balance);
  return {
    balance: normalizeInteger(body?.balance),
    currency: String(body?.balance?.currency || "").trim().toUpperCase() || "USD",
    raw: body,
  };
}

export async function fetchReplayBet(session) {
  const game = session.game || "degen-blackjack";
  const version = session.version || "1";
  const mode = session.mode || "BASE";
  const event = session.event;

  const url = joinRgsUrl(session.rgsUrl, `/bet/replay/${game}/${version}/${mode}/${event}`);
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Replay fetch failed: HTTP ${response.status}`);
  }

  const body = await response.json();
  return {
    payoutMultiplier: body.payoutMultiplier ?? null,
    costMultiplier: body.costMultiplier ?? 1.0,
    state: body.state ?? null,
    raw: body,
  };
}

export async function fetchReplayEvent(session) {
  // Try the official Stake GET endpoint first; fall back to the legacy POST.
  try {
    return await fetchReplayBet(session);
  } catch (_getError) {
    // GET endpoint unavailable or returned an error — fall through to POST.
  }

  const body = await postJson(
    joinRgsUrl(session.rgsUrl, "/replay/event"),
    {
      sessionID: session.sessionID,
      event: session.event,
      game: session.game || undefined,
      version: session.version || undefined,
    },
  );
  return {
    event: body?.event ?? null,
    round: normalizeStakeRound(body?.round),
    raw: body,
  };
}

export async function playRound(session, payload) {
  const body = await postJson(joinRgsUrl(session.rgsUrl, "/wallet/play"), {
    sessionID: session.sessionID,
    ...payload,
  });
  const normalizedRound = normalizeStakeRound(body?.round);
  if (body?.balance != null) emitWindowEvent("balanceUpdate", body.balance);
  emitWindowEvent("roundActive", { active: normalizedRound?.active === true });
  return {
    balance: normalizeInteger(body?.balance),
    currency: String(body?.balance?.currency || "").trim().toUpperCase() || "USD",
    round: normalizedRound,
    raw: body,
  };
}

export async function postRoundEvent(session, payload) {
  const body = await postJson(joinRgsUrl(session.rgsUrl, "/bet/event"), {
    sessionID: session.sessionID,
    ...payload,
  });
  return {
    event: body?.event ?? null,
    parsedEvent: parseMaybeJson(body?.event),
    raw: body,
  };
}

export async function endRound(session) {
  const body = await postJson(joinRgsUrl(session.rgsUrl, "/wallet/end-round"), {
    sessionID: session.sessionID,
  });
  if (body?.balance != null) emitWindowEvent("balanceUpdate", body.balance);
  emitWindowEvent("roundActive", { active: false });
  return {
    balance: normalizeInteger(body?.balance),
    currency: String(body?.balance?.currency || "").trim().toUpperCase() || "USD",
    raw: body,
  };
}
