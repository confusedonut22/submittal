import { derived, writable } from "svelte/store";

function boolFromQuery(value) {
  if (value == null) return false;
  const normalized = String(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function isLocalHost(value) {
  return (
    value === "localhost"
    || value === "127.0.0.1"
    || value === "::1"
    || value === "[::1]"
  );
}

export function normalizeRgsUrl(value, baseUrl = "https://example.com/") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const fallbackBase = new URL(baseUrl);

  if (/^https?:\/\//i.test(raw)) {
    return trimTrailingSlash(new URL(raw).toString());
  }

  if (raw.startsWith("//")) {
    return trimTrailingSlash(new URL(`${fallbackBase.protocol}${raw}`).toString());
  }

  if (/^[/.]/.test(raw)) {
    return trimTrailingSlash(new URL(raw, fallbackBase).toString());
  }

  const localMatch = raw.match(/^([^/?:#]+)([:/].*)?$/);
  if (localMatch && isLocalHost(localMatch[1])) {
    return trimTrailingSlash(new URL(`http://${raw}`).toString());
  }

  return trimTrailingSlash(new URL(`https://${raw}`).toString());
}

export function readLaunchDefaults(env = import.meta?.env ?? {}, baseUrl = "https://example.com/") {
  return {
    sessionID: String(env?.VITE_STAKE_SESSION_ID || "").trim(),
    lang: String(env?.VITE_STAKE_LANG || "en").trim() || "en",
    device: String(env?.VITE_STAKE_DEVICE || "").trim(),
    rgsUrl: normalizeRgsUrl(env?.VITE_STAKE_RGS_URL || "", baseUrl),
    replay: boolFromQuery(env?.VITE_STAKE_REPLAY),
    game: String(env?.VITE_STAKE_GAME || "").trim(),
    version: String(env?.VITE_STAKE_VERSION || "").trim(),
    mode: String(env?.VITE_STAKE_MODE || "").trim(),
    event: String(env?.VITE_STAKE_EVENT || "").trim(),
    social: boolFromQuery(env?.VITE_STAKE_SOCIAL),
  };
}

export function parseQuery(url, env = import.meta?.env ?? {}) {
  const parsed = new URL(url);
  const qp = parsed.searchParams;
  const defaults = readLaunchDefaults(env, parsed.toString());
  return {
    sessionID: qp.get("sessionID") ?? defaults.sessionID,
    lang: qp.get("lang") ?? defaults.lang,
    device: qp.get("device") ?? defaults.device,
    rgsUrl: normalizeRgsUrl(qp.get("rgs_url") ?? defaults.rgsUrl, parsed.toString()),
    replay: qp.has("replay") ? boolFromQuery(qp.get("replay")) : defaults.replay,
    game: qp.get("game") ?? defaults.game,
    version: qp.get("version") ?? defaults.version,
    mode: qp.get("mode") ?? defaults.mode,
    event: qp.get("event") ?? defaults.event,
    social: qp.has("social") ? boolFromQuery(qp.get("social")) : defaults.social,
  };
}

export const sessionQuery = writable({
  sessionID: "",
  lang: "en",
  device: "",
  rgsUrl: "",
  replay: false,
  game: "",
  version: "",
  mode: "",
  event: "",
  social: false,
});

function hasLaunchContext(session) {
  return Boolean(
    session.sessionID ||
    session.rgsUrl ||
    session.replay ||
    session.game ||
    session.version ||
    session.mode ||
    session.event ||
    session.device ||
    session.lang !== "en" ||
    session.social
  );
}

export const replayMode = derived(sessionQuery, ($sessionQuery) => {
  return $sessionQuery.replay || $sessionQuery.mode.toLowerCase() === "replay";
});

export const launchWarnings = derived(sessionQuery, ($sessionQuery) => {
  if (!hasLaunchContext($sessionQuery)) return [];
  const warnings = [];
  if (!$sessionQuery.sessionID) warnings.push("Missing sessionID");
  if (!$sessionQuery.rgsUrl) warnings.push("Missing rgs_url");
  return warnings;
});

export function initSessionFromQuery(url = window.location.href, env = import.meta?.env ?? {}) {
  sessionQuery.set(parseQuery(url, env));
}
