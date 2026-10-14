---
schema: dotclaude-spec/2
kind: package
id: P145
title: Spec CLI command that takes a planned change back to specified
wave: 3
deps: ["P94","P120"]
owns: ["src/plugins/dotclaude/slices/spec/adapters/unplan.ts","src/plugins/dotclaude/slices/spec/adapters/cli.ts","src/plugins/dotclaude/slices/spec/domain/states.ts","tests/dotclaude/spec/unplan.test.ts"]
satisfies: ["REQ-20"]
verify: just test tests/dotclaude/spec/unplan.test.ts && just test tests/dotclaude/spec && just lab
agent: implementer
status: planned
---

## Goal

`dotclaude-spec unplan <id> --reason <text>` moves a `planned` change back to `specified`, and logs the reason in `events.jsonl`.

## Context

- `spec/domain/states.ts:71-80`: the change moves, with `planned` reached by `plan` and by `specify`, and no move back.
- `spec/adapters/plan.ts`: the shape of a move command, with `refusedInWorktree`, `moveChange`, and `printMoved` of `transition.ts`.
- `spec/adapters/drop.ts:28-29`: the `--reason` flag.
- Session `d87f7ed2` of OpenJoystickDriver, 23:41 to 23:43: a change went to `planned` with an open problem, and no command took it back (`design.md`, "Spec CLI").

## Steps

1. Add the move `{ from: "planned", command: "unplan", to: "specified" }` to `CHANGE_TRANSITIONS`.
2. Add `unplan.ts`: it needs `--reason`, refuses a change with a package in a state past `planned`, and names that package.
3. Log the reason in the event of the move.
4. Add the command to `cli.ts` and its help.
5. Tests `unplan.test.ts`: a `planned` change with all packages `planned` moves back, the reason is in the event, a change with a `doing` package is refused, a `draft` change is refused, and a missing `--reason` is refused.

## Acceptance

- The verify command passes.

## Boundaries

- Do not change the gate of `plan`.
- Do not change `validate.ts`, which P146 owns.
- Tests check states and exit codes, not message text (REQ-17).
