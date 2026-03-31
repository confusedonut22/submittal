# Sidebets Blackjack — Submission Task Board

## Status legend
- [ ] not started
- [~] in progress
- [x] done

## 1. Engine / gameplay correctness
- [~] Add split-capable frontend/runtime hand state
- [ ] Add split-capable Python math engine hand state
- [ ] Ensure split 21 does not pay natural blackjack
- [ ] Enforce split-ace one-card rule
- [ ] Prevent resplit aces
- [ ] Validate total wager changes on split and double
- [ ] Ensure multi-hand progression/order is correct
- [ ] Decide/validate DAS behavior against RTP target

## 2. Frontend alignment
- [~] Enable split action in the UI
- [ ] Make button legality derive from engine/store truth cleanly
- [ ] Verify multi-hand messaging/results remain sensible
- [ ] Align all rules/help copy with locked ruleset
- [ ] Review session/replay/resume labels for misleading copy
- [ ] Update frontend readiness doc

## 3. Math / RTP / export
- [ ] Align Python math engine with split-capable rules
- [ ] Add fast RTP checkpoint workflow
- [ ] Re-check base RTP against < 98.0% target after rule changes
- [ ] Distinguish draft export scaffolds from final submission artifacts
- [ ] Update stake export assumptions to match real blackjack flow
- [ ] Keep side-bet math/docs aligned with paytables

## 4. Tests
- [~] Keep existing frontend tests green
- [ ] Add split creation test(s)
- [ ] Add split-21-not-blackjack test(s)
- [ ] Add split-ace-lock test(s)
- [ ] Add wager accounting test(s)
- [ ] Add math-side regression tests where needed

## 5. Docs / submission
- [x] Lock rules direction in docs
- [x] Add repo-local approval skills
- [ ] Commit repo-local skills
- [ ] Keep game spec current with actual implementation
- [ ] Produce concise submission checklist
- [ ] Prepare final approval artifact inventory

## Notes
- Base RTP must stay below 98.0%
- Surrender is not an RTP-lowering lever
- Favor concrete proof of progress: changed file, last command, last commit/test result
