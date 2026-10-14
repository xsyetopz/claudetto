---
schema: dotclaude-spec/2
kind: package
id: P136
title: Measurement of the investigator and researcher routes
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/routing-arms.md"]
satisfies: ["REQ-14","REQ-18"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/routing-arms.md && bun run lint:md
agent: main session
status: planned
---

## Goal

The evidence file gives the cost of each finished task and the quality of 4 arms on the eval cases of `investigator` and `researcher`, and the arm to ship for each agent.

## Context

- D11: `design.md`, "Model routes".
  The arms: Sonnet 5.5 `medium`, Sonnet 5.5 `high`, Opus 5.5 `low`, and Opus 5.5 `medium`.
- `just eval` and `just eval-variant` (`justfile:94-100`): a path target, `--max-cost-usd 5`, a lock, and `--keep-temp`.
- The eval cases: `src/plugins/dotclaude/slices/agents/evals/`, where `delegation-related-grouped` and `delegation-related-split` name the two agents.
- Dossier `07`, I16 recipe 1, 3, and 5: assert the arm, test the grader, and add a discrimination check.
  I18 recipe 1: record the model that served each request.

## Steps

1. List each eval case that runs `investigator` or `researcher`.
   If the cases cannot separate the arms, as in SL 1213c32c, stop, and report that more cases are needed.
2. Give each grader a known-good and a known-bad trace, and run one dry pass before the first paid run.
3. Run each arm on each case, as many times as the evidence file sets before the first run.
   Record the served model of each request, and drop an arm whose served model differs from its spec.
4. Write the method, the commands, the cost of each finished task, the quality, and the intervals.
5. Name the arm to ship for each agent, or "keep D11" when no arm is better.

## Acceptance

- The evidence file has the method, the served models, the results of each arm, and one pick for each agent.
- `bun run lint:md` passes.

## Boundaries

- Change no requirement and no agent file, which P135 owns.
- Keep the traces of each run.
- The cost of all runs stays under the bound that the user approves before the first paid run.
