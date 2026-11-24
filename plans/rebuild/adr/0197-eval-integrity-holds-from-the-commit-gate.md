---
status: proposed
date: 2026-11-24
---

# Eval Integrity Holds From the Commit Gate

Agent decision, pending user review.

## Context and Problem Statement

CON-055 asks that each eval score name the case commit it ran on. CON-056 asks that each case be
committed before its first run. The local results of 2026-11-21 to 2026-11-24 hold 293 run-and-case pairs.
For 88 of them the run started before the commit that holds its case, and 29 match no neighbouring commit
(`reports/2026-11-24-research/con056/runs.txt`). History cannot be re-ordered, and a rerun of every case
costs paid runs the plan does not budget. How do the two constraints apply to those runs?

## Considered Options

- Leave CON-055 and CON-056 open until every case is rerun after its commit.
- Enforce both from the `just eval` commit gate on; keep the earlier scores as history, and let
  `runs.txt` name the case commit of each run still on this machine.

## Decision Outcome

Chosen: the second option. The gate makes a run on an uncommitted case impossible through `just eval`, so
both constraints hold for every run after it. An earlier score is evidence only where `runs.txt` shows its
recorded prompt and graders match a commit. A score that matches no commit, or a case that was never
committed, gives no evidence for a gain over vanilla.

## Consequences

- No paid reruns are needed to close CON-055 and CON-056.
- A score whose result is no longer on this machine (the removed `delegate-two-files` and `plist-extract`
  cases, `2026-11-21T14-35-59-842Z`) names no case commit and stays history.
- A run outside `just eval` (a bare `claude plugin eval`) is not gated; such a run is reported apart.
- The user can reject this ADR, and CON-055 and CON-056 then reopen until the cited cases are rerun.

Source: `reports/2026-11-24-research/con056/README.md`; ADR-0196 (proposed decisions in a solo run).
