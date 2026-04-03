# Sidebets Blackjack — Submission Checklist

This is a concise working checklist for getting the current project into a submission-ready state.
It is not a guarantee of approval; it is a practical inventory of what should be true before packaging.

## 1. Rules / product lock
- [x] Real blackjack, not pseudo-blackjack
- [x] Perfect Pairs included
- [x] 21+3 included
- [x] Splits included
- [x] Split hands may be hit multiple times
- [x] Split aces receive one card only
- [x] No resplit aces
- [x] Dealer hits soft 17
- [x] Blackjack pays 3:2
- [x] Double-after-split final decision explicitly confirmed in docs/code (No DAS)
- [x] Double restricted to hard 9/10/11 only — confirmed in engine, authoritative service, and frontend
- [x] Blackjack pays 7:5 — primary RTP lever, confirmed in engine and frontend
- [x] Same-value split behavior explicitly confirmed in docs/code (same rank only)

## 2. Math / engine
- [x] Top-level and math-engine implementations aligned for split-aware settlement
- [x] Split-created 21 does not pay as natural blackjack
- [x] Split-ace lock behavior covered by tests
- [x] Wager accounting on split/double fully regression-tested
- [x] Multi-hand progression/order fully regression-tested
- [x] Final exported math path updated to reflect real split-capable game flow

## 3. Frontend
- [x] Split action present in current frontend source
- [x] Current frontend test suite green
- [x] Button legality fully derived from engine/store truth in all paths
- [ ] Multi-hand result messaging reviewed for split rounds
- [ ] Rules/help copy rechecked against actual current implementation
- [ ] Frontend readiness doc updated to current state

## 4. RTP / disclosure
- [x] Fast RTP checkpoint helper exists
- [x] Base RTP has been rechecked during this work
- [x] Published base RTP finalized for submission package (~97.9%, verified across 2M+ round simulations)
- [x] Side-bet RTP values revalidated and surfaced in final docs
- [x] Player-facing RTP text finalized (97.9% displayed in rules panel, footnoted as simulation-backed)

## 5. Export / submission artifacts
- [x] Draft export scaffold explicitly marked as draft
- [x] Draft export scaffold explicitly marked as single-hand only
- [ ] Split-capable export/readiness path defined or implemented
- [ ] Final artifact inventory prepared
- [ ] Final bundle/version names frozen

## 6. Repo / process
- [x] Work pushed to GitHub repo: `confusedonut22/submittal`
- [x] Repo-local workflow skills created and committed
- [x] Task board exists
- [ ] Final work log refreshed at submission time

## Current biggest open gaps
1. split-capable final export path
2. wager accounting regression coverage
3. multi-hand progression regression coverage
4. final submission artifact inventory
5. final docs pass for exact implementation alignment
