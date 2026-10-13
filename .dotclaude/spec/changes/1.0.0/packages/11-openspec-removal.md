---
schema: dotclaude-spec/2
kind: package
id: P11
title: OpenSpec removal
wave: 1
deps: ["P01b4"]
owns: ["openspec/",".claude/skills/"]
satisfies: []
verify: just check
agent: implementer
status: done
---

## Goal

Remove OpenSpec from the repository, because the spec workflow of dotclaude (`spec/`) replaces it.
The OpenSpec code of 0.28.0 in the slices goes with the package of its slice: setup in P09, and the status line in P08.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each `.claude-plugin/types/` folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree, because the type check reads them.
- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md:25`.
- The removed paths: `.dotclaude/spec/changes/1.0.0/tree.md:229`.
- The tracked OpenSpec files: `git ls-files openspec .claude/skills` (137 files, which include 6 skills in `.claude/skills/openspec-*/`).
- The list of the 0.28.0 paths that no package has ported: `tools/rebuild-pending.txt`.

## Steps

1. Delete `openspec/` and each `.claude/skills/openspec-*/` folder with `git rm -r`.
2. Remove `.claude/skills/` when it is empty.
3. Run `grep -ril openspec src tests tools`.
   Each file that it finds must be a 0.28.0 file that `tools/rebuild-pending.txt` names.
   When a file is not in the list, report it, and do not change it, because it is in the scope of another package.

## Acceptance

- `just check` passes.
- `git ls-files openspec .claude/skills` prints nothing.
- Your report has the output of `grep -ril openspec src tests tools`, and the line of `tools/rebuild-pending.txt` that names each file of that output.

## Boundaries

- Change only `openspec/` and `.claude/skills/`.
- Do not edit `src/`, `tests/`, `tools/`, or `plugins/`, because the packages of the slices remove their own OpenSpec code.
- Commit the work in one commit on the branch of your worktree, with the subject `dotclaude 1.0.0: P11 <summary>`.
  The main session merges it.
