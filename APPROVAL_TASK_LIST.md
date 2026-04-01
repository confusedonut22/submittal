# Sidebets Blackjack — Stake Engine Approval Task List

This file is a practical approval-readiness tracker for the current project.
It separates work that appears completed with high confidence from work that still needs confirmation or completion.

## Status legend
- [x] completed with high confidence
- [~] partially done / in progress / needs confirmation
- [ ] still needs to be done

---

## 1. Product / rules definition

### Completed with high confidence
- [x] Product direction is real blackjack, not pseudo-blackjack.
- [x] Perfect Pairs side bet is included in project logic/docs.
- [x] 21+3 side bet is included in project logic/docs.
- [x] Split support exists in engine/runtime.
- [x] Split aces are restricted to one card.
- [x] Resplitting aces is prevented.
- [x] Dealer hits soft 17 is the intended ruleset.
- [x] Blackjack pays 3:2 in current rules/docs.

### Still needs confirmation or completion
- [ ] Double-after-split (DAS) needs final explicit decision in code + docs.
- [ ] Same-value split policy needs final explicit decision in code + docs.
- [ ] Final approved ruleset needs one authoritative, implementation-matching source of truth.

---

## 2. Frontend gameplay behavior

### Completed with high confidence
- [x] Current repo includes Svelte/Vite frontend source.
- [x] Split action exists in current frontend/runtime path.
- [x] Frontend store progression fix for multi-hand advancement has been implemented and pushed.
- [x] A progression regression test now exists and passes in the current test setup.
- [x] Existing split/settlement-related targeted tests pass in current local test runs.
- [x] Preferred desktop reference build has been identified and restored on Vercel production alias.

### Still needs confirmation or completion
- [ ] Button legality should be verified as fully derived from engine/store truth in all play states.
- [ ] Multi-hand messaging/results should be reviewed for split rounds.
- [ ] Rules/help/disclosure copy should be rechecked against actual implementation.
- [ ] Mobile-vs-desktop UX changes should be reviewed to ensure desktop reference behavior is preserved.
- [ ] Frontend readiness doc should be refreshed/finalized against current implementation reality.

---

## 3. Math / RTP readiness

### Completed with high confidence
- [x] Split-capable Python math engine work exists.
- [x] Split-created 21 not paying as natural blackjack is implemented and covered.
- [x] Fast RTP checkpoint workflow exists.
- [x] Exact side-bet math work exists in repo.
- [x] Math scaffolding/docs exist for Stake-oriented export work.

### Still needs confirmation or completion
- [ ] Base-game RTP must be brought to or confirmed below 98.0%.
- [ ] Current rules should be re-evaluated to determine why recent RTP appears above target.
- [ ] DAS / split-rule choices should be assessed for RTP impact.
- [ ] Final publishable base RTP value for submission should be produced.
- [ ] Side-bet RTP values should be revalidated and surfaced in final docs.
- [ ] Player-facing RTP/disclosure text should be finalized.

---

## 4. Export / submission math artifacts

### Completed with high confidence
- [x] Draft export scaffold exists.
- [x] Draft export scaffold is documented as draft / not final.
- [x] Simulation artifacts exist in repo docs/workflow.

### Still needs confirmation or completion
- [ ] Final export path should reflect real split-capable blackjack flow.
- [ ] Variable-cost round handling (splits/doubles/insurance) must be finalized for submission artifacts.
- [ ] Final artifact formats/names should be frozen.
- [ ] Submission math bundle should be clearly separated from prototype scaffolding.

---

## 5. RGS / backend integration boundary

### Completed with high confidence
- [x] Frontend parses Stake-style launch/session parameters.
- [x] Frontend includes client-side flows for authenticate/balance/play/event/end-round behavior.
- [x] Frontend has repo-local round snapshot / hydrate support.
- [x] Mock RGS support exists for local round/replay/resume experimentation.

### Still needs confirmation or completion
- [ ] Confirm whether current RGS integration is submission-grade or still primarily a mock/scaffold.
- [ ] Verify that wallet/session/round authority lives in the correct backend boundary for Stake Engine expectations.
- [ ] Validate replay/resume requirements against intended Stake submission behavior.
- [ ] Confirm whether the current `round.state` format is acceptable or still draft-only.
- [ ] Identify anything that must move from client-side ownership to backend/service ownership.
- [ ] Ensure docs describing RGS flow match actual implementation and intended submission architecture.

---

## 6. Test coverage / regression confidence

### Completed with high confidence
- [x] Split creation behavior has targeted coverage.
- [x] Split-ace lock behavior has targeted coverage.
- [x] Split-created 21 settlement behavior has targeted coverage.
- [x] Hand progression ordering now has targeted coverage.

### Still needs confirmation or completion
- [ ] Wager accounting on split/double should be fully regression-tested.
- [ ] Multi-hand progression/order should be tested beyond the helper-level case.
- [ ] Frontend interaction paths around split/multi-hand flow should be reviewed for broader coverage.
- [ ] Math-side regression tests should be expanded where needed.

---

## 7. Docs / approval package consistency

### Completed with high confidence
- [x] Repo contains approval-oriented docs, checklists, and task tracking.
- [x] Source/reference PDFs have been added into the repo.
- [x] Stake Engine resource links have been added into the repo.
- [x] Live build reference has been added into the repo.

### Still needs confirmation or completion
- [ ] All docs should be checked for stale, contradictory, or overly optimistic statements.
- [ ] Game spec should be synchronized with real implementation.
- [ ] Frontend/math/RGS docs should align with the same final story.
- [ ] Final approval artifact inventory should be prepared.
- [ ] Final reviewer handoff/readme should be prepared.

---

## 8. Deployment / reference build control

### Completed with high confidence
- [x] Preferred desktop reference deployment has been identified.
- [x] `sidebet-blackjack.vercel.app` has been pointed at the preferred reference deployment.

### Still needs confirmation or completion
- [ ] Confirm whether any additional aliases/domains (including `www`) should point to the same deployment.
- [ ] Preserve reference desktop behavior while evaluating any future mobile UX changes.

---

## Recommended near-term order of operations

1. [ ] Review and tighten RGS/client boundary
2. [ ] Re-evaluate RTP and rules needed to get under 98.0%
3. [ ] Finalize export/math artifact path
4. [ ] Do a frontend submission-readiness pass
5. [ ] Expand regression coverage where risk is still high
6. [ ] Finalize docs and approval package inventory

