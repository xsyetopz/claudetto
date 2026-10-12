---
id: P16
deps: [P13, P14, P15, P19, P24, P26, P27, P28, P29, P30, P31, P32]
owns: ["tools/rebuild-pending.txt", "tests/support/rebuild-list.test.ts"]
verify: just check, and the user approves the version 1.0.0 and the push
agent: implementer
---

# P16 Release check

## Goal

Check the release of 1.0.0: `tools/rebuild-pending.txt` is empty, and its check is deleted with it.
A `reviewer` pass checks the full diff, and `just check` passes.
One session in `just sandbox` runs `/spec`, `/ship`, `/hotfix`, a decision, and a handoff.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:185-187`.
- The check of the list is `tests/support/rebuild-list.test.ts`, which checks that each line of `tools/rebuild-pending.txt` is on the list (`.dotclaude/spec/changes/1.0.0/packages/23-prompt-transforms.md`, Boundaries).
- The entry says `Deps: each package above`.
  This package lists the unfinished packages above it as its deps.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Remove the last lines of `tools/rebuild-pending.txt`, so that the file is empty.
2. Delete `tools/rebuild-pending.txt` and `tests/support/rebuild-list.test.ts`, because the list has no line to check.
3. Run a `reviewer` pass on the full diff of 1.0.0.
4. Run `just check`.
5. Run one session in `just sandbox` that runs `/spec`, `/ship`, `/hotfix`, a decision, and a handoff.

## Acceptance

- `just check` passes.
- The `reviewer` pass has no open finding.
- The sandbox session runs each of the five actions.
- The user approves the version 1.0.0 and the push.

## Boundaries

- Change only the paths of `owns`.
- Do not change a version or push a tag before the user approves it.
