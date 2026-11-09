# Design

## Context

`release-2-1-319` (`openspec/changes/archive/2026-11-09-release-2-1-319/`) rebuilt claudetto on the Claude Code v2.1.319 engine. `ISSUES-2026-11-09-1422.md` records what held the agent back since. This change keeps the engine and the version string.

## Goals

- Fix or record each open item of `ISSUES-2026-11-09-1422.md`.
- Re-audit every rule, gate, and hook (issue item 16).

## Non-Goals

- A new Claude Code engine version.
- A new version string. `package.json` stays at `2.1.319`.

## Decisions

- Branch `feat/2.1.319+1`, change `release-2-1-319-1`. The person chose the SemVer build-metadata form, because build metadata marks a build without a new version.
- The first delta is `constraint-ledger`, because issue items 3 and 13 recur on every prompt: the ledger showed "Do not delete branch 2-1-319" and "Leave alone ... package.json" again on 2026-11-09 while this change was set up. The other deltas follow from tasks 1.1 and 1.2.

## Risks

- The re-audit can widen the change past the issues file. Task 1.2 lists each removal for review before any code moves.
