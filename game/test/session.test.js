import test from "node:test";
import assert from "node:assert/strict";

import { get } from "svelte/store";
import {
  initSessionFromQuery,
  normalizeRgsUrl,
  parseQuery,
  readLaunchDefaults,
  replayMode,
  sessionQuery,
} from "../src/game/session.js";

test("session query parser reads stake launch params", () => {
  initSessionFromQuery("https://example.com/?sessionID=abc123&lang=en&device=desktop&rgs_url=https%3A%2F%2Frgs.example.com&game=degen-blackjack&version=1.2.3&mode=BASE&event=42");
  const session = get(sessionQuery);
  assert.equal(session.sessionID, "abc123");
  assert.equal(session.rgsUrl, "https://rgs.example.com");
  assert.equal(session.game, "degen-blackjack");
  assert.equal(session.version, "1.2.3");
  assert.equal(session.mode, "BASE");
  assert.equal(session.event, "42");
  assert.equal(get(replayMode), false);
});

test("replay mode is enabled from replay query params", () => {
  initSessionFromQuery("https://example.com/?sessionID=abc123&rgs_url=https%3A%2F%2Frgs.example.com&replay=true&mode=replay");
  assert.equal(get(replayMode), true);
});

test("plain local launch does not emit missing Stake param warnings", async () => {
  const { launchWarnings } = await import("../src/game/session.js");
  initSessionFromQuery("https://example.com/");
  assert.deepEqual(get(launchWarnings), []);
});

test("normalizeRgsUrl accepts bare hosts and localhost values", () => {
  assert.equal(normalizeRgsUrl("rgs.example.com/base"), "https://rgs.example.com/base");
  assert.equal(normalizeRgsUrl("localhost:8787/mock"), "http://localhost:8787/mock");
  assert.equal(normalizeRgsUrl("127.0.0.1:9000"), "http://127.0.0.1:9000");
});

test("parseQuery resolves relative rgs_url values against the launch URL", () => {
  const session = parseQuery("https://casino.example.com/play?sessionID=abc123&rgs_url=%2Fmock-rgs%2F");
  assert.equal(session.rgsUrl, "https://casino.example.com/mock-rgs");
});

test("parseQuery normalizes protocol-relative rgs_url values", () => {
  const session = parseQuery("https://casino.example.com/play?sessionID=abc123&rgs_url=%2F%2Frgs.example.com%2Fedge%2F");
  assert.equal(session.rgsUrl, "https://rgs.example.com/edge");
});

test("readLaunchDefaults supports Vite launch fallback values", () => {
  const defaults = readLaunchDefaults({
    VITE_STAKE_SESSION_ID: "env-session",
    VITE_STAKE_RGS_URL: "localhost:8787",
    VITE_STAKE_MODE: "BASE",
    VITE_STAKE_SOCIAL: "true",
  });

  assert.equal(defaults.sessionID, "env-session");
  assert.equal(defaults.rgsUrl, "http://localhost:8787");
  assert.equal(defaults.mode, "BASE");
  assert.equal(defaults.social, true);
});

test("parseQuery falls back to launch defaults and lets query params override them", () => {
  const session = parseQuery(
    "https://casino.example.com/play?sessionID=query-session&mode=replay",
    {
      VITE_STAKE_SESSION_ID: "env-session",
      VITE_STAKE_RGS_URL: "rgs.example.com/base",
      VITE_STAKE_MODE: "BASE",
      VITE_STAKE_REPLAY: "false",
    },
  );

  assert.equal(session.sessionID, "query-session");
  assert.equal(session.rgsUrl, "https://rgs.example.com/base");
  assert.equal(session.mode, "replay");
  assert.equal(session.replay, false);
});
