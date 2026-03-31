---
name: visible-work-proof
description: "Keep work visibly provable to the user during repo tasks. Use when the user wants to see evidence that work is actively happening, especially via: (1) current file being changed, (2) last command run, (3) last commit or test result, (4) explicit reporting of blocked harness/tool paths, and (5) preference for visible foreground work over opaque silent work when possible."
---

# Visible Work Proof

Use this skill when the user wants strong evidence that active work is happening and does not want to rely on trust alone.

## Main rule

Prefer **provable work traces** over reassurance.

## Required proof format

When giving a progress update, include:
- current file being changed
- last command run
- last commit / test result

Keep it short and concrete.

## Visible-first workflow

When possible:
1. prefer visible/foreground repo work
2. use long-running visible commands only if the tool is actually available
3. if a visible harness fails, say exactly why right away
4. immediately fall back to direct repo edits/commands instead of stalling

## Honesty rules

Never imply a visible coding harness is running if it failed to start.
Always report blockers explicitly, such as:
- CLI not installed
- usage/rate limit hit
- permission failure
- unsupported session/thread mode

## Recommended cadence

If the user requested periodic proof-of-work updates, keep them lightweight and repetitive rather than verbose.

Good format:
- current file being changed: ...
- last command run: ...
- last commit / test result: ...

## References

Read `references/checklist.md` for a short checklist.
