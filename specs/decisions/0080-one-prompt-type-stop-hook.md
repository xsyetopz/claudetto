---
status: superseded by ADR-0104
date: 2026-11-16
---

# One Prompt-Type Stop Hook

## Context and Problem Statement

How many model calls a Stop makes and what judges a reply.

## Considered Options

* One prompt-type Stop hook carrying the fault list from `texts-grade.ts` (a statement about code with no workspace read in the turn blocks with that fault's fix; a clean reply passes after one call).
* A second-model vote (rejected: it doubles the calls per stop; the loss from skipping it has no number).
* `useSliceCommits`, a grader, and `named-files.ts` (deleted).

## Decision Outcome

Chosen: one hook, one call. The open-items check has the model write open items as `- [ ]` with `! <command>`; a step with no command goes to AskUserQuestion; block once, then pass (`stop_hook_active`); offers in running prose are not checked (no sound structural signal; decide by measured false-positive rate); a numbered list without a checkbox passes (a known limit; no count of such replies exists). `onFailure` has no effect on Stop, SubagentStop, TaskCompleted, TeammateIdle; Stop blocks cap at 8 in a row; the prompt-type Stop judge has 0 tools and judges transcript evidence only (an agent's own "tests pass" counts); agent-type hooks default to Haiku with few steps, so every verifier hook sets `model` and gates on exit codes and files, not prose.

### Consequences

The 2-1-323 design deleted the grader and slice-commit hooks. ADR-0104 (2026-11-17) later chose no Stop check and no Stop claim grader, which removes the one hook chosen here. The hook-behavior facts in the decision (`onFailure` has no effect on Stop, the cap of 8 Stop blocks, a prompt-type judge with 0 tools) stay as reference; the revisit check is the ADR-0177 measured comparison against vanilla.

### Confirmation

A test asserts one model call per stop.

## More Information

Basis: reported and cited. Status: partial at 088a227c (`plugins/claudetto/hooks/features/stop-notice/`, `prompt/texts.ts`).
Source: openspec/specs/run-limits/spec.md:139; openspec/changes/archive/2026-11-16-2-1-323/design.md:124.
