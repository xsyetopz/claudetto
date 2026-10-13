---
schema: dotclaude-spec/2
kind: package
id: P13
title: `handoff`
wave: 3
deps: ["P03","P05","P06","P07","P32"]
owns: ["src/plugins/dotclaude/slices/handoff/","tests/dotclaude/handoff/","src/plugins/dotclaude/hooks/","src/kernel/slice.ts","tools/generate/"]
satisfies: []
verify: just test tests/dotclaude/handoff && just lab
agent: implementer
status: done
---

# P13 `handoff`

## Goal

Port the handoff of 0.28.0 to the slice `handoff`: the triggers, the handoff file, `/clear`, the resume, the `/handoff` skill, and `mainHandover`.
The handoff file goes to `.dotclaude/`, as P32 defines it.
Each handler names its eval kinds in an optional field of `src/kernel/slice.ts`, and the generator writes `plugins/<plugin>/evals/hooks.json` from the eval cases of each slice.

## Context

- P13 starts after each other slice package of the core plugin is merged, because the rebuild list makes P13 the last one (`.dotclaude/spec/changes/1.0.0/packages.md:120`).
- The generator writes `plugins/<plugin>/evals/hooks.json`, because `tests/support/hook-evals.test.ts` needs the file.
  Wave 2 keeps the file hand-written on the rebuild list (`.dotclaude/spec/changes/1.0.0/packages.md:119`).
- The folder `src/plugins/dotclaude/hooks/` holds `description.txt` and `hooks.json` in this checkout.
  The entry names `hooks/legacy.ts`, `lib/`, and `features/context/` too, but these paths do not exist under `src/` here, so only the folder is in `owns`.
- The entry names `hooks/PostToolUse/context.ts` for the 0.28.0 context bound of subagents.
  This file is not under `src/` in this checkout, so find it in the 0.28.0 history before you move it.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 16112523 HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and this package: `.dotclaude/spec/changes/1.0.0/packages.md:117-125`.
- The slice contract: `src/kernel/slice.ts`, and the source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`.
- Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree.

## Steps

1. Write the slice `handoff` in `src/plugins/dotclaude/slices/handoff/`, with the triggers, the handoff file, `/clear`, the resume, the `/handoff` skill, and `mainHandover`.
2. Add the optional field of each handler that names its eval kinds to `src/kernel/slice.ts`.
   Change the generator in `tools/generate/` to write `plugins/<plugin>/evals/hooks.json` from that field.
3. Move the 0.28.0 `PostToolUse` context bound of subagents into `handoff`, so that no behavior is lost.
   A handoff hook has `requests: 0`, because it makes no model call.
4. Remove the folder `src/plugins/dotclaude/hooks/`.
5. Write the tests in `tests/dotclaude/handoff/`.
   Run `just generate`, `just test tests/dotclaude/handoff`, and `just lab`.

## Acceptance

- `just test tests/dotclaude/handoff` and `just lab` pass.
- `tests/support/hook-evals.test.ts` passes with the generated `plugins/<plugin>/evals/hooks.json`.
- One run in `just sandbox` shows the resume.
- The folder `src/plugins/dotclaude/hooks/` does not exist after the change.

## Boundaries

- Change only the paths of `owns`.
- Remove the lines of your 0.28.0 paths from `tools/rebuild-pending.txt` when you remove their code.
- Write each text that goes to Claude in strict ASD-STE100, with no forceful words.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Do not change `src/kernel/` except `src/kernel/slice.ts`.
