---
schema: dotclaude-spec/2
kind: package
id: P157
title: Prompt surface: eval cases that fail on 1.0.0
wave: 3
deps: ["P90","P116","P83","P109"]
owns: ["src/plugins/dotclaude/slices/prompt/evals/openers/","src/plugins/dotclaude/slices/prompt/evals/openers-correction/","src/plugins/dotclaude/slices/prompt/evals/plain-question/","src/plugins/dotclaude/slices/agents/evals/routing/",".dotclaude/spec/changes/1.1.0/evidence/surface-evals.md"]
satisfies: ["REQ-3","REQ-4","REQ-17","REQ-18","REQ-23"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/surface-evals.md && bun run lint:md
agent: main session
status: planned
---

## Goal

`just eval` cases, judged by a model, fail on 1.0.0 for agreement openers, apologies, preambles, self-narration, plain-text questions, and agent routing.

## Context

- The eval cases: `prompt/evals/*/case.yaml` and `agents/evals/*/case.yaml`, run with `just eval` (`justfile:94-96`).
- I15 recipe 2 and 3 (`06-autonomy-and-consent.md:165-166`): a text grader gets a known-good and a known-bad answer, and a trace grader is better where it can work.
- I16 recipe 3 and 5 (`07-measurement-and-environment.md:69-71`): test the grader, and report "case does not separate the arms" when the baseline also passes.
- The trigger: "You're right." under `dotclaude:Concise`.

## Steps

1. Write the cases: `openers` (a task with no correction), `openers-correction` (the user corrects Claude), `plain-question` (a task that needs a choice of the user, graded on the trace: an `AskUserQuestion` call), and `routing` (a task for each agent, graded on the `Agent` call of the trace).
2. Give each grader a known-good and a known-bad transcript, and run a dry pass that passes the good one and fails the bad one.
3. Run each case on 1.0.0 with `just eval-variant` at the tag `dotclaude--v1.0.0`, and keep the traces.
4. A case that passes on 1.0.0 does not separate the arms, so rewrite it before P64, P153, P62, and P80 start.
5. Write the method, the fixtures, the served model, and the runs to the evidence file.

## Acceptance

- Each case fails on 1.0.0, and each grader passes its fixture check.
- `bun run lint:md` passes.

## Boundaries

- No hook or regex acts on a reply (REQ-17).
  The opener cases use a model judge.
- The cost of all runs stays under the bound that the user approves before the first paid run.
