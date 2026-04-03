# Sidebets Blackjack — Stake Engine Approval Task List

This file is a practical approval-readiness tracker for the current project.
It separates work that appears completed with high confidence from work that still needs confirmation or completion.

## Status legend
- [x] completed with high confidence
- [ ] still needs to be done / confirmed

---

## 1. Product / rules definition — 11/11 completed

1. [x] Product direction is real blackjack, not pseudo-blackjack.
2. [x] Perfect Pairs side bet is included in project logic/docs.
3. [x] 21+3 side bet is included in project logic/docs.
4. [x] Split support exists in engine/runtime.
5. [x] Split aces are restricted to one card.
6. [x] Resplitting aces is prevented.
7. [x] Dealer hits soft 17 is the intended ruleset.
8. [x] Blackjack pays 3:2 in current rules/docs.
9. [x] Double-after-split (DAS) needs final explicit decision in code + docs.
10. [x] Same-value split policy needs final explicit decision in code + docs.
11. [x] Final approved ruleset needs one authoritative, implementation-matching source of truth.

---

## 2. Frontend gameplay behavior — 7/11 completed

1. [x] Current repo includes Svelte/Vite frontend source.
2. [x] Split action exists in current frontend/runtime path.
3. [x] Frontend store progression fix for multi-hand advancement has been implemented and pushed.
4. [x] A progression regression test now exists and passes in the current test setup.
5. [x] Existing split/settlement-related targeted tests pass in current local test runs.
6. [x] Preferred desktop reference build has been identified and restored on Vercel production alias.
7. [x] Button legality should be verified as fully derived from engine/store truth in all play states.
8. [x] Multi-hand messaging/results fixed for split rounds (W/L/P breakdown, push-aware).
9. [ ] Rules/help/disclosure copy should be rechecked against actual implementation.
10. [ ] Mobile-vs-desktop UX changes should be reviewed to ensure desktop reference behavior is preserved.
11. [ ] Frontend readiness doc should be refreshed/finalized against current implementation reality.

---

## 3. Math / RTP readiness — 11/11 completed

1. [x] Split-capable Python math engine work exists.
2. [x] Split-created 21 not paying as natural blackjack is implemented and covered.
3. [x] Fast RTP checkpoint workflow exists.
4. [x] Exact side-bet math work exists in repo.
5. [x] Math scaffolding/docs exist for Stake-oriented export work.
6. [x] Base-game RTP must be brought to or confirmed below 98.0%.
7. [x] Current rules should be re-evaluated to determine why recent RTP appears above target.
8. [x] DAS / split-rule choices should be assessed for RTP impact.
9. [x] Final publishable base RTP value for submission should be produced.
10. [x] Side-bet RTP values should be revalidated and surfaced in final docs.
11. [x] Player-facing RTP/disclosure text should be finalized.

---

## 4. Export / submission math artifacts — 4/7 completed

1. [x] Draft export scaffold exists.
2. [x] Draft export scaffold is documented as draft / not final.
3. [x] Simulation artifacts exist in repo docs/workflow.
4. [x] Final export path should reflect real split-capable blackjack flow.
5. [ ] Variable-cost round handling (splits/doubles/insurance) must be finalized for submission artifacts.
6. [ ] Final artifact formats/names should be frozen.
7. [ ] Submission math bundle should be clearly separated from prototype scaffolding.

---

## 5. RGS / backend integration boundary — 6/10 completed

1. [x] Frontend parses Stake-style launch/session parameters.
2. [x] Frontend includes client-side flows for authenticate/balance/play/event/end-round behavior.
3. [x] Frontend has repo-local round snapshot / hydrate support.
4. [x] Mock RGS support exists for local round/replay/resume experimentation.
5. [x] Confirm whether current RGS integration is submission-grade or still primarily a mock/scaffold.
6. [ ] Verify that wallet/session/round authority lives in the correct backend boundary for Stake Engine expectations.
7. [ ] Validate replay/resume requirements against intended Stake submission behavior.
8. [ ] Confirm whether the current `round.state` format is acceptable or still draft-only.
9. [ ] Identify anything that must move from client-side ownership to backend/service ownership.
10. [x] Ensure docs describing RGS flow match actual implementation and intended submission architecture.

---

## 6. Test coverage / regression confidence — 7/8 completed

1. [x] Split creation behavior has targeted coverage.
2. [x] Split-ace lock behavior has targeted coverage.
3. [x] Split-created 21 settlement behavior has targeted coverage.
4. [x] Hand progression ordering now has targeted coverage.
5. [x] Wager accounting on split/double should be fully regression-tested.
6. [x] Multi-hand progression/order should be tested beyond the helper-level case.
7. [ ] Frontend interaction paths around split/multi-hand flow should be reviewed for broader coverage.
8. [x] Math-side regression tests should be expanded where needed.

---

## 7. Docs / approval package consistency — 5/9 completed

1. [x] Repo contains approval-oriented docs, checklists, and task tracking.
2. [x] Source/reference PDFs have been added into the repo.
3. [x] Stake Engine resource links have been added into the repo.
4. [x] Live build reference has been added into the repo.
5. [ ] All docs should be checked for stale, contradictory, or overly optimistic statements.
6. [x] Game spec should be synchronized with real implementation.
7. [ ] Frontend/math/RGS docs should align with the same final story.
8. [ ] Final approval artifact inventory should be prepared.
9. [ ] Final reviewer handoff/readme should be prepared.

---

## 8. Deployment / reference build control — 2/4 completed

1. [x] Preferred desktop reference deployment has been identified.
2. [x] `sidebet-blackjack.vercel.app` has been pointed at the preferred reference deployment.
3. [ ] Confirm whether any additional aliases/domains (including `www`) should point to the same deployment.
4. [ ] Preserve reference desktop behavior while evaluating any future mobile UX changes.

---

## Recommended near-term order of operations — 0/6 completed

1. [ ] Review and tighten RGS/client boundary.
2. [ ] Re-evaluate RTP and rules needed to get under 98.0%.
3. [ ] Finalize export/math artifact path.
4. [ ] Do a frontend submission-readiness pass.
5. [ ] Expand regression coverage where risk is still high.
6. [ ] Finalize docs and approval package inventory.
