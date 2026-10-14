---
schema: dotclaude-spec/2
kind: package
id: P140
title: User-owned values ask with the old and new value (I14)
wave: 5
deps: ["P139","P143"]
owns: ["src/plugins/dotclaude/slices/asks/domain/testdiff.ts","src/plugins/dotclaude/slices/asks/domain/values.ts","tests/dotclaude/asks/values.test.ts"]
satisfies: ["REQ-16"]
verify: just test tests/dotclaude/asks/values.test.ts && just lab
agent: implementer
status: planned
---

## Goal

A change of a bound, a budget, a baseline, or a test expectation asks, and the ask names the old value and the new value.

## Context

- I14 recipe 1 and 2 in `external/agent-failure-dossier/06-autonomy-and-consent.md:114-117`: a registry of user-owned values, and consent that names the value.
- The field case: `STYLE_MAX_BYTES` from 5,680 to 7,061 on an ambiguous "yes" (SL 1213c32c, 9c0492e2).
- `asks/domain/testdiff.ts:9`: a limits file gets weaker when a bound changes value or goes away.
- The bound places: `src/kernel/budget.ts`, `slices/<s>/limits.ts`, and `tools/limits.ts`.

## Steps

1. Put the registry in `values.ts`: the bound files, the baselines, the eval `case.yaml` expectations, and the test expectations.
2. For each changed value, give the name, the old value, and the new value.
3. The ask reason names each changed value as `NAME old -> new`.
4. Tests `values.test.ts`: a raised bound, a lowered bound, a removed bound, a changed expectation, and a change that keeps each value, on the decision and the parsed values only.

## Acceptance

- The verify command passes.

## Boundaries

- Do not change a bound.
- Tests check the parsed values and the decisions, not the reason text (REQ-17).
