---
id: P32
deps: [P28, P24, P26, P27]
owns: ["src/kernel/paths.ts", "src/plugins/dotclaude/slices/asks/domain/paths.ts", "src/plugins/dotclaude/slices/asks/domain/writes.ts", "src/plugins/dotclaude/slices/asks/domain/content.ts", "src/plugins/dotclaude/slices/asks/domain/hooks.ts", "src/plugins/dotclaude/slices/asks/limits.ts", "src/plugins/dotclaude/slices/setup/domain/exclude.ts", "src/plugins/dotclaude/slices/setup/adapters/exclude-step.ts", "src/plugins/dotclaude/slices/setup/adapters/files.ts", "src/plugins/dotclaude/slices/setup/adapters/cli.ts", "src/plugins/dotclaude/slices/setup/skills/setup/SKILL.md", "tests/dotclaude/setup/exclude.test.ts", "tests/dotclaude/asks/"]
verify: just check
agent: implementer
---

# P32 `.dotclaude/`

## Goal

Each file that dotclaude writes moves to `.dotclaude/` in the project, or to `~/.dotclaude/` for the user.
The layout is based on `.claude/`.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:166-173`, and the decisions of the user in `.dotclaude/spec/changes/1.0.0/change.md`.
- The entry says first to list each file that dotclaude writes, with its scope (project or user), whether git tracks it, and whether `.gitignore` or `.git/info/exclude` gets its rule.
  The list is the first step of this package.
- The files that write a `.claude` path are in the `asks` slice (`domain/writes.ts`, `domain/content.ts`, `domain/hooks.ts`, `limits.ts`) and in the `setup` slice (`adapters/files.ts`, `adapters/cli.ts`, `adapters/exclude-step.ts`, `domain/exclude.ts`, `skills/setup/SKILL.md`).
  The path code of the `asks` slice is in `domain/paths.ts`.
- The setup adds the rules in the same way as the `.git/info/exclude` rules of P09 (`.dotclaude/spec/changes/1.0.0/packages/09-setup.md`).
- P13 writes the handoff file to `.dotclaude/`, so P13 starts after P32.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. List each file that dotclaude writes, with its scope, whether git tracks it, and whether `.gitignore` or `.git/info/exclude` gets its rule.
2. Move the paths into the one kernel module `src/kernel/paths.ts`, so that each slice reads them from one place.
3. Change the path parts of the `asks` and `setup` slices to read `src/kernel/paths.ts`.
4. Add the exclude rules to `.git/info/exclude` in `setup/domain/exclude.ts` and `adapters/exclude-step.ts`, as P09 does.
5. Write `tests/dotclaude/setup/exclude.test.ts` with a test for each rule: a repository with no rule, one with the rule, and a folder that is not a git repository.
6. Run `just check`, and one session in `just sandbox`.

## Acceptance

- `just check` passes.
- A test covers each rule of the Verify line: no rule, one rule, and no git repository.
- A `git status` after one session in `just sandbox` shows no untracked dotclaude file.

## Boundaries

- Change only the paths of `owns`.
- Remove the lines of your 0.28.0 paths from `tools/rebuild-pending.txt` when you remove their code.
- Write each text that goes to Claude in strict ASD-STE100.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
