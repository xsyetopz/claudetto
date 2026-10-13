---
id: P49
deps: [P48]
owns: ["src/plugins/dotclaude/slices/spec/adapters/", "tests/dotclaude/spec/cli/"]
verify: just check
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

## Acceptance

- CLI tests cover each command, each refusal of a gate, `--json`, and the short path of a trivial change.

## Boundaries

- Do not write `trace`, because P50 owns it.
