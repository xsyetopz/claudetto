---
schema: dotclaude-spec/2
kind: package
id: P10
title: `agents`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude/slices/agents/","tests/dotclaude/agents/"]
satisfies: []
verify: just test tests/dotclaude/agents && just lab && just validate && just check
agent: implementer
status: done
---

## Goal

Move the agents of dotclaude to the slice `agents`, as the seven agents of the table in `workflow.md`, each with a fixed model and effort, and an `agent.spawn` handler that applies the turn bound of a subagent.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them, and they give the input and the answer of `agent.spawn`.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and this package: `packages.md:85-86`.
- The slice contract: `src/kernel/slice.ts` (the field `agents`), and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `.dotclaude/spec/changes/1.0.0/design.md:160-172`.
  A test does not check the text of a prompt or a manifest field.
- The agents, their models, efforts, and tools: `.dotclaude/spec/changes/1.0.0/workflow.md:98-116`, and the files: `.dotclaude/spec/changes/1.0.0/tree.md:161-166`.
  Use the model ids `claude-haiku-5-5`, `claude-sonnet-5-5`, and `claude-opus-5-5`.
- The generator copies the agents of a slice to `plugins/dotclaude/agents/` (`tools/generate/emit/slices.ts:52-57`, `:126-134`).
- The 0.28.0 agents: `src/plugins/dotclaude/agents/` (`debugger.md`, `implementer.md`, `investigator.md`, `reviewer.md`, `test-runner.md`), with `maxTurns` in their front matter.
  Their models differ from the table: for example, `implementer` is on Haiku and `reviewer` is on Sonnet.
  `researcher` and `planner` do not exist.
- The test of 0.28.0: `tests/dotclaude/agents.test.ts`.
- The `prompt` slice has an `agent.spawn` handler in the phase `rewrite` (`src/plugins/dotclaude/slices/prompt/adapters/mod.ts:25-29`), which adds the block of the model to the task prompt.
  Do not change it.
- The rebuild list: `tools/rebuild-pending.txt:42-45`.

## Steps

1. Write `slice.ts`, `domain/turns.ts`, and `adapters/mod.ts` with the `agent.spawn` handler.
   Read in the types what an `agent.spawn` handler can change.
   When it cannot set the turn bound, keep the bound in the `maxTurns` of the front matter, write no handler, and report it.
2. Write the seven agents in `agents/`, from the 0.28.0 texts, with the model, the effort, and the tools of the table.
   `planner` writes only under `spec/`, so check whether a tool rule in the front matter can bound it, and report what it can bound.
3. Write the tests in `tests/dotclaude/agents/`: the turn bound of `domain/turns.ts`, and that each agent of the table has a file with the model and the effort of the table.
4. Remove the 0.28.0 agents, their test, and their lines in `tools/rebuild-pending.txt`.
5. Run `just generate`, `just lab`, `just validate`, and `just check`.
6. Spawn each agent one time in `just sandbox` (read `wiki/plugins/Sandbox.md` first), and record the model of each run in your report.
   When the sandbox cannot run in your environment, report it, and do not mark this step done.

## Acceptance

- `just test tests/dotclaude/agents`, `just lab`, `just validate`, and `just check` pass.
- `plugins/dotclaude/agents/` has seven files, one for each agent of the table.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, and the 0.28.0 paths of `tools/rebuild-pending.txt:42-45` and those lines.
- Do not change the `prompt` slice, `src/kernel/`, or `tools/generate/`.
- Write the agent texts in strict ASD-STE100, with semantic line breaks, and with no forceful words.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P10 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
