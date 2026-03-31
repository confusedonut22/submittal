import test from "node:test";
import assert from "node:assert/strict";

import {
  authenticateSession,
  endRound,
  fetchBalance,
  fetchReplayEvent,
  joinRgsUrl,
  normalizeAuthenticateResponse,
  playRound,
  postRoundEvent,
} from "../src/game/rgsClient.js";

test("normalizeAuthenticateResponse parses integer balance and config", () => {
  const normalized = normalizeAuthenticateResponse({
    balance: { amount: "250000000" },
    config: {
      minBet: "1000000",
      maxBet: "5000000",
      stepBet: "1000000",
      betLevels: ["1000000", "2000000", "5000000"],
      jurisdiction: {
        disabledAutoplay: true,
        displayRTP: false,
        minimumRoundDuration: "2500",
      },
    },
    round: { betID: "12", active: false, mode: "BASE", state: { done: true } },
  });

  assert.equal(normalized.balance, 250_000_000);
  assert.equal(normalized.currency, "USD");
  assert.equal(normalized.config.minBet, 1_000_000);
  assert.equal(normalized.config.maxBet, 5_000_000);
  assert.deepEqual(normalized.config.betLevels, [1_000_000, 2_000_000, 5_000_000]);
  assert.equal(normalized.round.betID, 12);
  assert.equal(normalized.round.active, false);
  assert.equal(normalized.jurisdictionFlags.disabledAutoplay, true);
  assert.equal(normalized.jurisdictionFlags.displayRTP, false);
  assert.equal(normalized.jurisdictionFlags.minimumRoundDuration, 2500);
});

test("authenticateSession posts to the Stake authenticate endpoint", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          balance: 123_000_000,
          config: { minBet: 1_000_000, maxBet: 5_000_000, stepBet: 1_000_000 },
          round: null,
        });
      },
    };
  };

  const response = await authenticateSession({
    sessionID: "abc123",
    rgsUrl: "https://rgs.example.com/base/",
    lang: "en",
    device: "desktop",
    game: "degen-blackjack",
    social: false,
  });

  assert.equal(calls[0].url, "https://rgs.example.com/base/wallet/authenticate");
  assert.equal(JSON.parse(calls[0].init.body).sessionID, "abc123");
  assert.equal(response.balance, 123_000_000);
  assert.equal(response.currency, "USD");
});

test("playRound posts to the wallet play endpoint and normalizes balance", async () => {
  let capturedUrl = "";
  globalThis.fetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          balance: { amount: "121000000" },
          round: { betID: "99", active: true, mode: "BASE" },
        });
      },
    };
  };

  const response = await playRound(
    { sessionID: "abc123", rgsUrl: "https://rgs.example.com" },
    { amount: 2_000_000, mode: "BASE" },
  );

  assert.equal(capturedUrl, "https://rgs.example.com/wallet/play");
  assert.equal(response.balance, 121_000_000);
  assert.equal(response.currency, "USD");
  assert.equal(response.round.betID, 99);
  assert.equal(response.round.active, true);
});

test("fetchBalance posts to the wallet balance endpoint and normalizes balance", async () => {
  let capturedUrl = "";
  let capturedBody = null;
  globalThis.fetch = async (url, init) => {
    capturedUrl = url;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          balance: { amount: "121000000" },
        });
      },
    };
  };

  const response = await fetchBalance(
    { sessionID: "abc123", rgsUrl: "https://rgs.example.com" },
  );

  assert.equal(capturedUrl, "https://rgs.example.com/wallet/balance");
  assert.deepEqual(capturedBody, { sessionID: "abc123" });
  assert.equal(response.balance, 121_000_000);
  assert.equal(response.currency, "USD");
});

test("postRoundEvent stringifies structured events", async () => {
  let capturedBody = null;
  globalThis.fetch = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ event: "ok" });
      },
    };
  };

  await postRoundEvent(
    { sessionID: "abc123", rgsUrl: "https://rgs.example.com" },
    { event: JSON.stringify({ betID: 10, sequence: 1, event: { type: "playerAction", action: "hit" } }) },
  );

  assert.equal(typeof capturedBody.event, "string");
});

test("endRound posts to the wallet end-round endpoint and normalizes balance", async () => {
  let capturedUrl = "";
  let capturedBody = null;
  globalThis.fetch = async (url, init) => {
    capturedUrl = url;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ balance: { amount: "200000000" } });
      },
    };
  };

  const response = await endRound(
    { sessionID: "abc123", rgsUrl: "https://rgs.example.com" },
  );

  assert.equal(capturedUrl, "https://rgs.example.com/wallet/end-round");
  assert.deepEqual(capturedBody, { sessionID: "abc123" });
  assert.equal(response.balance, 200_000_000);
  assert.equal(response.currency, "USD");
});

test("fetchReplayEvent hits the replay endpoint and normalizes the round", async () => {
  let capturedUrl = "";
  let capturedBody = null;
  globalThis.fetch = async (url, init) => {
    capturedUrl = url;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          event: "15",
          round: {
            betID: "15",
            active: false,
            mode: "BASE",
            state: {
              phase: "RESULT",
              dealerHand: [],
              hands: [],
              shoe: [],
            },
          },
        });
      },
    };
  };

  const response = await fetchReplayEvent({
    sessionID: "abc123",
    rgsUrl: "https://rgs.example.com",
    event: "15",
    game: "blackjack",
    version: "1",
  });

  assert.equal(capturedUrl, "https://rgs.example.com/replay/event");
  assert.deepEqual(capturedBody, {
    sessionID: "abc123",
    event: "15",
    game: "blackjack",
    version: "1",
  });
  assert.equal(response.round.betID, 15);
  assert.equal(response.round.active, false);
});

test("joinRgsUrl preserves base paths and normalizes bare hosts", () => {
  assert.equal(
    joinRgsUrl("rgs.example.com/base/", "/wallet/authenticate"),
    "https://rgs.example.com/base/wallet/authenticate",
  );
  assert.equal(
    joinRgsUrl("localhost:8787/mock", "bet/event"),
    "http://localhost:8787/mock/bet/event",
  );
});
