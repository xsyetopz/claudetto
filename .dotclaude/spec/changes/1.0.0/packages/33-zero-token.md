---
id: P33
deps: [P19, P28, P34]
owns: [".dotclaude/spec/changes/1.0.0/evidence/zero-token.md", "src/plugins/dotclaude/slices/spec/", "tests/dotclaude/spec/", "src/plugins/dotclaude/slices/setup/", "tests/dotclaude/setup/", "src/plugins/dotclaude-sessions/slices/usage/", "src/plugins/dotclaude-sessions/slices/start-cost/", "tests/sessions/", "src/plugins/dotclaude-lab/slices/eval-compare/", "tests/lab/"]
verify: just check
agent: implementer
---

# P33 Zero token cost

## Goal

dotclaude does each task at zero token cost where it can.
A hook, a script, a setting, or a status line command does the work, not a model call or a turn of Claude.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md`, P33.
- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-12.
- An example: the lanes of `events.jsonl` change when a package is ticked or merged, with no model call.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Write `.dotclaude/spec/changes/1.0.0/evidence/zero-token.md`: each task that dotclaude or its workflow gives to Claude, and that a hook, a script, a setting, or a status line command can do, with its token cost now.
2. The main session reads the list, and adds the files of each moved task to `owns`, so that no open package overlaps.
   The main session chose on 2026-10-12:
   - Items 2, 3, 4, and 7 move first. They need nothing from Claude Code, and they change only the `spec` slice.
   - Items 1, 5, and 6 move when a lab or a live session shows the mod behavior that the list names as open.
     When it does not, the item stays, and the evidence file says why.
   - Item 8 starts after P13 merges, because the `handoff` slice of P13 pins the `maxTurns` of `test-runner`.
     Its files go into `owns` then.
   - Items 9 and 10 need no change.
3. Move each task of the list to its zero-token form, with a test for each.
4. Measure the token cost of each moved task before and after, with `dotclaude-usage`.

## Acceptance

- `just check` passes.
- Each moved task has a test and a cost before and after.
- The lanes change with no model call.

## Boundaries

- Change only the paths of `owns`.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
