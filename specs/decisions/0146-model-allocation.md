---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:73 (day of decision not recorded)
---

# Model Allocation

## Context and Problem Statement

claudetto needed a default for which model runs the main session and which runs subagents. The 50-70% savings claim of `goals/RESEARCH.md` section 5 had no A/B behind it.

## Considered Options

- (a) One subagent model.
- (b) `Artemis` on `claude-haiku-5-5`.
- (c) `opusplan` as the fresh-install default.

## Decision Outcome

Chosen option: stock main model as the default, no `opusplan` default, and setup's subagent model unchanged. An A/B of 8 cases x 3 runs x 4 arms ($5.81, 6,019,138 tokens) backed it. The lead decided, because the user told the session to keep going without asking for a decision.

## Consequences

- The decision and its table live in `feature-map.md`, "Model allocation A/B for task 3.4".

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:73.
