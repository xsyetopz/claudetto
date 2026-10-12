---
id: P31
deps: []
owns: ["AGENTS.md", ".claude/rules/", "tests/support/sizes.test.ts", "tests/dotclaude/import-rules.test.ts"]
verify: just check, and a glob check that each paths entry matches at least one file
agent: implementer
---

# P31 Repository rules

## Goal

Each rule of `AGENTS.md` that applies to some files only moves to a `paths:` rule in `.claude/rules/`.
`AGENTS.md` keeps the rules for each file, and links to `.claude/rules/`, so that a tool that reads only `AGENTS.md` can find them.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:162-165`.
- The tests that pin `AGENTS.md` are `tests/support/sizes.test.ts` (the 6 KB bound of `CLAUDE.md` and `AGENTS.md`) and `tests/dotclaude/import-rules.test.ts` (the import rules of `AGENTS.md`).
  The other tests that name `AGENTS.md` only cite it in a comment.
- The `paths:` format and its evidence come from P28: `.dotclaude/spec/changes/1.0.0/evidence/claude-directory.md`.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Sort each rule of `AGENTS.md` by the files that it applies to.
2. Move each rule that applies to some files only to a `paths:` rule in `.claude/rules/`.
3. Keep in `AGENTS.md` the rules for each file, and add a link to `.claude/rules/`.
4. Update the two tests that pin `AGENTS.md`.
5. Check that each `paths:` entry matches at least one file.

## Acceptance

- `just check` passes.
- A glob check shows that each `paths:` entry matches at least one file.
- A tool that reads only `AGENTS.md` finds the link to each rule file.

## Boundaries

- Change only the paths of `owns`.
- Write the rules in STE-flavored ASD-STE100, with one sentence on each line.
