---
schema: dotclaude-spec/2
kind: package
id: P137
title: Eval of the routes before the release
wave: 6
deps: ["P135","P80","P148","P149"]
owns: [".dotclaude/spec/changes/1.1.0/evidence/routes-eval.md"]
satisfies: ["REQ-14"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/routes-eval.md && bun run lint:md
agent: main session
status: planned
---

## Goal

`just eval` passes on the agents with the routes, the bodies, and the tools of 1.1.0, and the evidence file has the method and the results.

## Context

- REQ-14: each route change passes `just eval` before the release.
- `just eval` (`justfile:94-96`).
- The routes of P135, the bodies of P80, the isolation of P148, and the tools of P149.
- Dossier `07`, I16 and I18 recipe 1.

## Steps

1. Run `just eval` on the agent cases and the prompt cases, and record the served model of each request.
2. Compare each case with the run of 1.0.0 in the wiki evals pages.
3. Write the method, the commands, the served models, and the results.
4. For a case that fails, name the route or the change that causes it, and report it to the user.

## Acceptance

- Each case passes, or the user accepts each failure in the evidence file.
- `bun run lint:md` passes.

## Boundaries

- Change no agent file.
  A route change goes back to P135 with the user's approval.
- Keep the traces of each run.
