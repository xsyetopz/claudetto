---
id: P05
deps: [P01b4]
owns: ["src/plugins/dotclaude/slices/guard/", "tests/dotclaude/guard/"]
verify: just test tests/dotclaude/guard && just lab && just check
agent: implementer
---

# P05 `guard`

## Goal

Port the 0.28.0 features `guard` and `reads` to one slice `guard`, with the same behavior.
The slice denies a `Bash` command that only prints a file and gives the `Read` call (design D22), and asks before the first call of a session that reaches a GitHub repository of another owner with an AI policy.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.
- The slice contract: `src/kernel/slice.ts`, and the manifest rules: `spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `spec/changes/1.0.0/design.md:160-172`.
- A ported slice to use as the model: `src/plugins/dotclaude/slices/prompt/`, its tests `tests/dotclaude/prompt/`, and its hook lab tests `src/plugins/dotclaude/slices/prompt/lab/`.
- The kernel: `src/kernel/budget.ts` has the values of `plugins/dotclaude/lib/budget.ts`, and `src/kernel/shell.ts` has the shell parser.
- The files of `guard`: `spec/changes/1.0.0/tree.md:120-123`.
  The tree has no file for the ask of `guard`, so add `domain/owners.ts` (or a name that fits) for it.
- The 0.28.0 code:
  - `plugins/dotclaude/features/guard/rules.ts` (149 lines): the ask for a repository of another owner.
  - `plugins/dotclaude/features/reads/rules.ts` (218 lines) and `limits.ts` (4 lines): the deny of a command that prints a file.
  - `plugins/dotclaude/hooks/legacy.ts:56-93` (`output`, `ownersOf`, `guardAsk`), `:106-115` (`countOf`), `:157-169` (`tool.call` on `Bash`), and `:186-195` (the `tool.check` handler that `guard` shares with `adherence`).
  - The tests: `tests/dotclaude/guard/rules.test.ts`, `tests/dotclaude/reads/large.test.ts`, and `tests/dotclaude/reads/print.test.ts`.
  - The eval entries: `plugins/dotclaude/evals/hooks.json`, the keys `tool.call Bash reads` and `tool.check guard adherence`.
- The rebuild list: `tools/rebuild-pending.txt:13-17`.

## Steps

1. Write `slice.ts`, `limits.ts`, `domain/reads.ts`, `domain/deny.ts`, the domain file of the ask, and `adapters/mod.ts`.
   The slice has a `tool.call` handler on `Bash` in the phase `check`, and a `tool.check` handler in the phase `check`.
   The `tool.check` handler keeps a `deny` of `next`, and when `next` gives an `ask`, it joins its own reason to that reason with a blank line, so that the ask of the `asks` slice (P06) stays.
   Each function that touches `$` stays in `adapters/mod.ts`, because `claude plugin validate` follows `$` only in one file (`legacy.ts:22-24`).
2. Move the tests to `tests/dotclaude/guard/`, and write a hook lab test in `slices/guard/lab/` for each handler.
3. In `legacy.ts`, remove the functions, the imports, the header lines, and the `Bash` handler of `reads`.
   In the shared `tool.check` handler, remove only the `guardAsk` call.
4. Change the eval entries of `guard` and `reads` to the new slice and lab tests.
5. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`.
6. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/guard`, `just lab`, and `just check` pass.
- Each case of the 0.28.0 tests has a case in the new tests with the same verdict.
- `grep -rn "features/guard\|features/reads" src tests tools plugins` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:13-17` and those lines, and these shared files, each only in the parts of your capability:
  - `plugins/dotclaude/hooks/legacy.ts`
  - `plugins/dotclaude/evals/hooks.json`
  - the sentences of `description` in `src/plugins/dotclaude/hooks/hooks.json`
  Other packages of the wave change other parts of these files, and the main session resolves the merge.
- Do not change `src/kernel/`.
  When the kernel does not have the code that you need from `plugins/dotclaude/lib/`, write it in your slice and name it in your report, because P13 deletes `lib/`.
- Do not change the behavior of a hook, and do not port the `asks` of `adherence` (P06).
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P05 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
