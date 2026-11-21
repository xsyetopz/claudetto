---
status: accepted
date: recorded in openspec/changes/2-1-325-rearchitecture/design.md:85 (day of decision not recorded)
---
# Overlapping Rewrites and Nags Go

## Context and Problem Statement

Several claudetto texts and hooks repeated what a tool deny, a setting, or the engine already did: plan-mode, `EnterPlanMode`, `ExitPlanMode`, and `NotebookEdit` text rewrites beside the tool denies; classic-hook duplicates; the budget in both prompt and status line; a per-prompt "Constraints the user stated earlier" injection (about 150 hits); a Budget line on each prompt (30 times in one session); Stop-judge and Stop "run it with Bash" feedback (10 times); the Stop "files not committed" nag (removed in release 16ecb31b). Later specs still cut `EnterPlanMode` and `ExitPlanMode` to 200 chars or fewer through `tool.describe`. Which of these goes?

## Considered Options

- Delete every overlapping rewrite and nag, including the 200-char `tool.describe` cut.
- Delete only the rewrites that overlap a tool deny; keep the `tool.describe` cut of `EnterPlanMode` and `ExitPlanMode` to 200 chars or fewer.

## Decision Outcome

Chosen: delete only the rewrites that overlap a tool deny, and keep the `tool.describe` cut. The later spec keeps that cut, and it is not an overlap with a deny.

## Consequences

- The plan-mode, `EnterPlanMode`, `ExitPlanMode`, and `NotebookEdit` text rewrites go; the nags go.
- `EnterPlanMode` and `ExitPlanMode` keep a text of 200 chars or fewer.

Source: openspec/changes/2-1-325-rearchitecture/design.md:85 (rewrites overlap the tool denies and are deleted), :142 (per-prompt injection, Budget line, Stop feedback), :144 (Stop nag removed in 16ecb31b); openspec/specs/surface-trim/spec.md:355 (200-char text for `EnterPlanMode`, `ExitPlanMode`).
