---
id: P49
deps: [P48]
owns: ["src/kernel/spec-store.ts", "src/kernel/state-events.ts", "src/plugins/dotclaude/slices/spec/", "src/plugins/dotclaude/slices/statusline/", "src/plugins/dotclaude/slices/handoff/domain/trigger.ts", "tests/kernel/", "tests/dotclaude/spec/", "tests/dotclaude/statusline/", ".dotclaude/spec/changes/1.0.0/"]
verify: just check, and `dotclaude-spec validate 1.0.0` passes on the converted store
agent: main session
---

# P49 Phase Commands of `dotclaude-spec`

## Goal

`dotclaude-spec` has one subcommand for each phase, with the verb of its slash command, and each subcommand checks the gate of its state change.

## Context

- The design: `design-spec-2.md`, sections Package States, Change States, and Commands.
- The commands of P46 are the base: `show`, `list`, `deps`, `log`, `review`, and `drop`.

## Steps

1. Add `specify`, `plan`, `implement`, `verify`, `review`, `merge`, `accept`, `archive`, `block`, and `drop`, each with `--json`.
2. `verify <package>` runs the `verify` command of the package and records the command, the exit status, and the SHA.
3. `review approve` records the SHA of the last verify event, and `merge` refuses a branch head with another SHA.
4. `implement` after a failed verify or a reject needs `--decision fix-code|revise-spec`.
5. For a trivial or a medium change, `specify <id>` writes the package `P1` and moves the change to `planned`.
6. Remove `new`, `lane`, `retry`, and `record`, and update `status`, `show`, `list`, `deps`, `log`, `ready`, and `runs` to schema 2.
7. Each command that changes a state writes the `status` key of the file of the change or of the package.
8. Switch each reader of the store to schema 2, including the status line and the handoff trigger, and remove the code and the tests of schema 1.
9. Convert `.dotclaude/spec/changes/1.0.0/` with the conversion of P48, and fix the 15 problems that `validate 1.0.0` reports today.
10. Replace schema 1 in place, with no second copy and no version in a name (the user, 2026-10-13).
    Move `domain/v2/*` into `domain/`, `templates/v2.ts` into `templates/`, and `src/kernel/state-events.ts` into `src/kernel/spec-store.ts`, and remove each `V2` or `2` suffix.
11. Remove `convert.ts` and its tests after step 9, because schema 2 has no compatibility with schema 1.

## Acceptance

- CLI tests cover each command, each refusal of a gate, `--json`, and the short path of a trivial change.
- `dotclaude-spec validate 1.0.0` passes, and each package keeps its state.

## Boundaries

- No file, folder, type, or constant has `v1`, `v2`, or a schema number in its name.

- Do not write `trace`, because P50 owns it.
