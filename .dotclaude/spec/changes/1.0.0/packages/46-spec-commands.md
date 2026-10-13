---
id: P46
deps: []
owns: ["src/plugins/dotclaude/slices/spec/", "src/kernel/spec-store.ts", "tests/dotclaude/spec/", "tests/kernel/spec-store.test.ts"]
verify: just check, just lab, and one session in just sandbox that uses each new command
agent: main session
---

# P46 Spec Commands

## Goal

`dotclaude-spec` gives the root and the user the control of OpenSpec and Spec Kitty, with the lanes and packages of dotclaude.

## Context

- The ranked list: `docs/research/agents-models/18-spec-commands.md`.
- Each command runs in the main checkout only, like `lane`, and has `--json`.

## Steps

Add the commands in this order, each with its tests:

1. `show <id> [<package>]`: the brief, deps, `owns`, lane, and last events of one package.
2. `list`: the open and archived changes, with size and lane counts.
3. `lane <package> <lane> --note <text>`: the note is required for `blocked` and for a move back, and it goes to `events.jsonl`.
4. `review <package> approve|reject [--finding <text>]...`: a verdict event.
   `reject` moves the package to `doing`, and `merge` refuses a package with no `approve`.
5. `retry <package>`: moves `review` or `blocked` to `doing` and prints the stored findings.
6. `drop <package> --reason <text>`: the terminal lane `canceled`.
7. `deps [<id>]`: the wave graph, the blocked chains, and the `owns` overlaps.
8. `log [<id>] [--package <p>]`: `events.jsonl` as lines.

## Acceptance

- Each command has tests, `--json`, and a line in the help text.
- `just check` passes, and a sandbox session uses each command.

## Boundaries

- Keep the lanes and the format of `events.jsonl`.
- Each new command runs in the main checkout only.
