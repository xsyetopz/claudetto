---
status: accepted
date: 2026-11-18
---
# Logic Is Checked by Running It, Not by Review

## Context and Problem Statement

The user reports that a Fable 5.2 review catches bad ideas but misses bad logic. Fable and Opus are never a subagent model (goal rule), so a second model review of logic would run on Sonnet or Haiku, which are weaker reviewers than the model that missed the fault. How does claudetto check logic?

## Considered Options

- A second model review of each change.
- A logic check by execution: each claim about behaviour gets a probe, a test, or a mutant that must be killed, and the reply reports the command and its result.

## Decision Outcome

Chosen: execution. Design review (ideas, scope, trade-offs) stays with the main-loop model. Logic (an algorithm, a condition, an edge case, a cost formula) is checked by a run whose result could have come out the other way: a test with a stated predicted outcome, a probe, or a mutant per [ADR-0180](0180-behavioural-and-mutation-tests.md). A logic claim with no such run is reported as unverified.

## Consequences

- No reviewer agent is added for logic ([ADR-0177](0177-pragmatism-gate.md)).
- The reported gap was not reproduced on the models a review can run on (paid runs, 2.1.327, reports/2026-11-18-research/paid-labs/logic/). Eight single-function seeded bugs and two clean functions, 3 runs each on Haiku, Sonnet and Opus 5.5 at medium and high: every arm found 24 of 24 bugs with no extra lines; on clean code Haiku raised false alarms (3 of 6 clean at high, 5 of 6 at medium) while Sonnet and Opus said none 6 of 6. A 66-line module with 4 seeded bugs, reviewed under a design-only prompt and a correctness prompt (Haiku, Sonnet and Opus medium, Opus high, 3 runs each): every reply named all 4 bug causes under both prompts. Fable 5.2 was run after approval (2026-11-18, `runs-fable.jsonl`, `runs-v2-fable.jsonl`): at high it found 24 of 24 seeded bugs with no extra lines and said none on 6 of 6 clean runs; on the 66-line module, all 12 replies (medium and high, both prompts, 3 runs each) named all 4 bugs, including the design-only prompt. The line scorer gave one high design reply 2 of 4 because it cited lines 27 and 64 as table cells, which its regex does not read; the reply text names both faults. The reported Fable gap (catches bad ideas, misses bad logic) is not reproduced on seeded bugs, which are smaller than real multi-file faults. The decision stands for that reason: execution checks the fault classes a reading review cannot reach, and a Haiku reviewer would add false alarms.
- A formula in the plan (for example the break-even rule of [ADR-0178](0178-renewal-at-task-boundaries.md)) is checked by a computed example, recorded with its inputs.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); reports/2026-11-18-research/papers.md P8 implication 1 and P4 implications 1 and 3 (TACL 2024.tacl-1.78: a prompted model corrects itself only with an external signal such as execution, and a self-review must beat sampling at equal cost; https://aclanthology.org/2024.tacl-1.78.pdf).
