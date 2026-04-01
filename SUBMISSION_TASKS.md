# Sidebets Blackjack — Submission Task Board

## Status legend
- [ ] not started
- [~] in progress
- [x] done

## 1. Engine / gameplay correctness
- [x] Add split-capable frontend/runtime hand state
- [x] Add split-capable Python math engine hand state
- [x] Ensure split 21 does not pay natural blackjack
- [x] Enforce split-ace one-card rule
- [x] Prevent resplit aces
- [x] Validate total wager changes on split and double
- [x] Ensure multi-hand progression/order is correct
- [x] Decide/validate DAS behavior against RTP target

## 2. Frontend alignment
- [x] Enable split action in the UI
- [x] Make button legality derive from engine/store truth cleanly
- [ ] Verify multi-hand messaging/results remain sensible
- [ ] Align all rules/help copy with locked ruleset
- [ ] Review session/replay/resume labels for misleading copy
- [ ] Update frontend readiness doc

## 3. Math / RTP / export
- [x] Align Python math engine with split-capable rules
- [x] Add fast RTP checkpoint workflow
- [x] Re-check base RTP against < 98.0% target after rule changes
- [x] Distinguish draft export scaffolds from final submission artifacts
- [x] Update stake export assumptions to match real blackjack flow
- [ ] Keep side-bet math/docs aligned with paytables

## 4. Tests
- [x] Keep existing frontend tests green
- [x] Add split creation test(s)
- [x] Add split-21-not-blackjack test(s)
- [x] Add split-ace-lock test(s)
- [x] Add wager accounting test(s)
- [x] Add math-side regression tests where needed

## 5. Docs / submission
- [x] Lock rules direction in docs
- [x] Add repo-local approval skills
- [x] Commit repo-local skills
- [x] Keep game spec current with actual implementation
- [ ] Produce concise submission checklist
- [ ] Prepare final approval artifact inventory

## Notes
- Base RTP must stay below 98.0%
- Surrender is not an RTP-lowering lever
- Favor concrete proof of progress: changed file, last command, last commit/test result
