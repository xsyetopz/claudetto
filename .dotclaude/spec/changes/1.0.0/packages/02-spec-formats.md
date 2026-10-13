---
schema: dotclaude-spec/2
kind: package
id: P02
title: Spec formats
wave: 1
deps: []
owns: ["src/plugins/dotclaude/slices/spec/domain/","tests/dotclaude/spec/domain/"]
satisfies: []
verify: just test tests/dotclaude/spec/domain
agent: implementer
status: done
---

# P02 Spec formats

## Goal

Write the pure domain code of the spec workflow: the parser, the validator, and the delta rules of the Markdown formats of the spec store.
The `dotclaude-spec` CLI of P03 and the archive step call this code, so it has no I/O and no host API.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each `.claude-plugin/types/` folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree, because the type check reads them.
- The spec store and its formats: `.dotclaude/spec/changes/1.0.0/workflow.md:3-43`.
- The checks of `validate` and the rule of `archive`: `.dotclaude/spec/changes/1.0.0/workflow.md:61-72`.
- The domain files of the `spec` slice: `.dotclaude/spec/changes/1.0.0/tree.md:144-150`.
- The code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- A file of each kind to use as a real fixture: `.dotclaude/spec/changes/1.0.0/packages/01a-kernel.md` (a package), and `.dotclaude/spec/changes/1.0.0/packages.md` (tasks with `Verify:` lines).
- The types of `state.json` and its reader are in `src/kernel/spec-store.ts`, which P01a writes at the same time.
  This package does not import that file, and it does not define the types of `state.json`.

## Steps

1. Write `domain/formats.ts` with the types of a requirement, a scenario, a capability spec, a delta file (`ADDED`, `MODIFIED`, `REMOVED`, `RENAMED`), a task, and a package (its front matter and its sections).
   Give the package front matter the fields `id`, `deps`, `owns`, `verify`, and `agent`.
2. Write `domain/parse.ts`: a function for each format that takes the text of one file and gives the typed value or a list of errors with line numbers.
3. Write `domain/validate.ts`:
   - A requirement has a sentence with `SHALL` and one or more scenarios with `WHEN` and `THEN` lines.
     EARS forms such as `WHILE <state>` and `IF <error> THEN` are valid.
   - A task has a `Verify:` line.
   - A package has the sections Goal, Context, Steps, Acceptance, and Boundaries.
   - An `owns` entry is a folder prefix or a file path, with no wildcard, and not under `plugins/`.
   - Two open packages of one wave have no overlapping `owns`: two entries overlap when one is a prefix of the other.
   - Each `deps` entry names a package that exists, and the deps have no cycle.
4. Write `domain/delta.ts`: apply the deltas of one capability to its spec, as a pure function that gives the new spec or the list of failures.
   `RENAMED` runs first, with `FROM:` and `TO:` lines.
   `ADDED` fails on a name that exists, and `MODIFIED` and `REMOVED` fail on a name that does not exist.
   When one delta fails, the function gives no new spec.
5. Write the tests in `tests/dotclaude/spec/domain/`: a fixture for each format, a case for each validation rule, and a case for each delta rule, each a pass and a failure.

## Acceptance

- `just test tests/dotclaude/spec/domain` passes.
- No file in `domain/` imports `node:`, `bun:`, a file outside `domain/`, or uses `Bun`.
- Each function is an arrow function, and the domain is plain data and pure functions.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- `bunx biome lint src/plugins/dotclaude/slices/spec/domain tests/dotclaude/spec/domain` passes.

## Boundaries

- Change only `src/plugins/dotclaude/slices/spec/domain/` and `tests/dotclaude/spec/domain/`.
- Do not write `slice.ts`, an adapter, the CLI, a skill, or a template of the `spec` slice, because P03 and P04 own them.
- Add no parser library to `package.json`.
- Commit the work in one commit on the branch of your worktree, with the subject `dotclaude 1.0.0: P02 <summary>`.
  The main session merges it.
