---
id: P25
deps: [P09]
owns: ["src/plugins/dotclaude/slices/setup/domain/automode.ts", "src/plugins/dotclaude/slices/setup/texts.ts/automode.json", "src/plugins/dotclaude/slices/setup/adapters/settings-cmd.ts", "tests/dotclaude/setup/settings.test.ts"]
verify: just test tests/dotclaude/setup && just lab
agent: implementer
---

# P25 `automode`

## Goal

The setup writes `autoMode` to the user settings, with `$defaults` in each list and one `environment` entry.
The `environment` entry names the agent worktrees `.claude/worktrees/agent-*` and the Claude Code temp folder `/private/tmp/claude-<uid>/`.
The classifier then allows the removal of those paths, and each default deny rule stays.

## Context

- The entry: `spec/changes/1.0.0/packages.md:133-137`, and the evidence: `spec/changes/1.0.0/evidence/automode.md`.
- The `autoMode` lists count only in the user settings, as `src/plugins/dotclaude/slices/setup/domain/drift.ts` and `adapters/settings-cmd.ts` state.
- The P25 entry is done in `spec/changes/1.0.0/packages.md:133`.
  This file lists the files that name `autoMode`, so that the package matches the code of the change.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Keep the `autoMode` parts in `domain/automode.ts`, the texts in `texts.ts/automode.json`, and the write in `adapters/settings-cmd.ts`.
2. Keep the test that the written lists start with `$defaults` in `tests/dotclaude/setup/settings.test.ts`.
3. Run `claude auto-mode critique` on the entry.

## Acceptance

- `just test tests/dotclaude/setup` and `just lab` pass.
- `claude auto-mode critique` runs on the written entry, and its output is in the report.
- A test shows that the written lists start with `$defaults`.

## Boundaries

- Change only the paths of `owns`.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
