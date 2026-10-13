---
schema: dotclaude-spec/2
kind: package
id: P19
title: `decide`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude/slices/decide/","tests/dotclaude/decide/","src/plugins/dotclaude-jev/","tests/jev/"]
satisfies: []
verify: just test tests/dotclaude/decide && just lab && just check
agent: implementer
status: done
---

# P19 `decide`

## Goal

Move the `dotclaude-jev` add-on into the slice `decide` of the core plugin, and remove the add-on.
Each decision that facts settle goes to Jev through the TypeSafe API.
When the API key is missing or not valid, or the account has no balance, the decision goes to a small Claude model through `$.model.complete`.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them, and they give the API of `$.model` and `$.tool.register`.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and this package: `packages.md:87-90`.
- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md:35-37`, and `change.md:71-72`.
- The files: `.dotclaude/spec/changes/1.0.0/tree.md:132-138`, and the removal: `tree.md:230`.
- The slice contract: `src/kernel/slice.ts`, and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `.dotclaude/spec/changes/1.0.0/design.md:160-172`.
- The 0.28.0 add-on:
  - `plugins/dotclaude-jev/features/jev/`: `tool.ts` (150 lines), `cli.ts` (244, the API URL at `:30`), `format.ts` (71), `ask.ts` (106), `limits.ts` (52), and `run.ts` (47, which starts `bun --no-env-file` as a child at `:9-14` and passes the key in the env at `:22`).
  - `plugins/dotclaude-jev/hooks/register.ts`: `on("session.start")` at `:77`, `$.tool.register` at `:80`, and `on("tool.call")` for `AskUserQuestion` and `second_opinion` at `:85`.
  - Its text fallback with no key: `tool.ts:133,148`, and `ask.ts:10`.
  - The tests: `plugins/dotclaude-jev/tests/` and `tests/jev/`.
- No code in the repository calls `$.model` yet, so read its type before you design the fallback.
- The rebuild list: `tools/rebuild-pending.txt:105-108`.

## Steps

1. Read the type of `$.model.complete`, and the error or the response of the TypeSafe API for a missing key, a key that is not valid, and an account with no balance.
   When `$.model.complete` does not exist, stop, and report it.
2. Write `slice.ts`, `limits.ts`, `ports.ts` (`DecisionProvider`), `domain/request.ts`, `domain/route.ts`, `domain/picks.ts`, `adapters/mod.ts`, `adapters/jev.ts`, `adapters/fallback.ts`, and `adapters/cli.ts`.
   `domain/route.ts` picks the provider from the cause, as a pure function.
3. Write the tests in `tests/dotclaude/decide/`: a case for each fallback cause with a fake `DecisionProvider`, the route for each cause, and the hook lab tests in `slices/decide/lab/`.
4. Remove the add-on: `src/plugins/dotclaude-jev/`, `plugins/dotclaude-jev/`, `tests/jev/`, its entry in `.claude-plugin/marketplace.json`, its lines in `tools/rebuild-pending.txt`, and each other reference that `grep -rn dotclaude-jev` finds outside `wiki/`, `src/wiki/`, `CHANGELOG.md`, and `spec/`.
5. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/decide`, `just lab`, and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude` passes.
- `grep -rn dotclaude-jev src tests tools plugins .claude-plugin justfile package.json` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`, and the key never reaches a log, a test fixture, or a commit.

## Boundaries

- Change only the paths of `owns`, `plugins/dotclaude-jev/`, the lines of `tools/rebuild-pending.txt:105-108`, the `dotclaude-jev` entry of `.claude-plugin/marketplace.json`, and the other references of step 4.
- Do not send a request to the TypeSafe API from a test, and do not use a real key.
- Do not change `src/kernel/` or `tools/generate/`.
- Write each text that goes to Claude in strict ASD-STE100.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P19 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
