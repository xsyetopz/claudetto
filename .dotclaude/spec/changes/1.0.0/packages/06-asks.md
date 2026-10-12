---
id: P06
deps: [P01b4]
owns: ["src/plugins/dotclaude/slices/asks/", "tests/dotclaude/asks/"]
verify: just test tests/dotclaude/asks && just lab && just check
agent: implementer
---

# P06 `asks`

## Goal

Port the asks of the 0.28.0 feature `adherence` to the slice `asks`, with one domain file for each ask, and the same behavior.
The asks: a `git` command that discards work, a change to a test, a limits file, a config, a hook, or a settings file, a `Bash` write to one of these files, and a new skipped test or lint suppression.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.
- The slice contract: `src/kernel/slice.ts`, and the manifest rules: `spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `spec/changes/1.0.0/design.md:160-172`.
- A ported slice to use as the model: `src/plugins/dotclaude/slices/prompt/`, its tests `tests/dotclaude/prompt/`, and its hook lab tests `src/plugins/dotclaude/slices/prompt/lab/`.
- The kernel has `shell.ts`, `shellkinds.ts`, `wrappers.ts`, `text.ts`, and `budget.ts`.
  `plugins/dotclaude/lib/code.ts` (43 lines) has no kernel copy.
- The files of `asks`: `spec/changes/1.0.0/tree.md:124-127` (`git.ts`, `writes.ts`, `content.ts`, `comments.ts`, `scripts.ts`).
  The 0.28.0 feature also has `kinds.ts`, `hookscripts.ts`, `shellforms.ts`, `shellwrites.ts`, and `text.ts`.
  Give each ask one domain file, and put the shared helpers in as few other domain files as fit.
- The 0.28.0 code:
  - `plugins/dotclaude/features/adherence/` (11 files, 1656 lines), with the entry `checkCall` at `rules.ts:115`.
  - `plugins/dotclaude/hooks/legacy.ts:27-29` (imports), `:53-54` (`ADHERENCE_TOOLS`), `:95-104` (`fileText`), `:117-132` (`adherenceAsk`), and `:186-195` (the `tool.check` handler that `adherence` shares with `guard`).
  - The tests: `tests/dotclaude/adherence/` (12 files, 1754 lines).
  - The eval entry: `plugins/dotclaude/evals/hooks.json`, the key `tool.check guard adherence`.
- The rebuild list: `tools/rebuild-pending.txt:19-21`.

## Steps

1. Write `slice.ts`, `limits.ts`, the domain files, and `adapters/mod.ts`.
   The slice has a `tool.check` handler in the phase `check`.
   It keeps a `deny` of `next`, and when `next` gives an `ask`, it joins its own reason to that reason with a blank line, so that the ask of the `guard` slice (P05) stays.
   Each function that touches `$` stays in `adapters/mod.ts`, because `claude plugin validate` follows `$` only in one file (`legacy.ts:22-24`).
2. Move the tests to `tests/dotclaude/asks/`, and write a hook lab test in `slices/asks/lab/`.
3. In `legacy.ts`, remove the functions, the imports, and the header lines of `adherence`.
   In the shared `tool.check` handler, remove only the `adherenceAsk` call.
4. Change the eval entry of `adherence` to the new slice and lab test.
5. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`.
6. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/asks`, `just lab`, and `just check` pass.
- Each case of the 0.28.0 tests has a case in the new tests with the same verdict.
- `grep -rn "features/adherence" src tests tools plugins` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:19-21` and those lines, and these shared files, each only in the parts of your capability:
  - `plugins/dotclaude/hooks/legacy.ts`
  - `plugins/dotclaude/evals/hooks.json`
  - the sentences of `description` in `src/plugins/dotclaude/hooks/hooks.json`
  Other packages of the wave change other parts of these files, and the main session resolves the merge.
- Do not change `src/kernel/`.
  When the kernel does not have the code that you need from `plugins/dotclaude/lib/`, write it in your slice and name it in your report, because P13 deletes `lib/`.
- Do not change the behavior of an ask, and do not port `guard` or `reads` (P05).
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P06 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
