# Review of the Agents Slice (P83)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
The scope: `src/plugins/dotclaude/slices/agents/`, `src/fragments/`, and `tests/dotclaude/agents/`.
The fix package is P109.

## Confirmed Findings

### I18, I08: `search-route` names a tool that the agents do not have

- File: `src/fragments/search-route.md:1`, included by all six agents.
- Command: `grep -n "^tools:\|Search with" plugins/dotclaude/agents/*.md`
- Output: `debugger` and `implementer` have no `tools`, and the other four list `Grep` next to `Bash`.
  Each of the six says "Search with `Grep`".
- The review run shows it.
  The `reviewer` has `tools: Read, Grep, Glob, Bash`, but the run got only `Read` and `Bash`.
  `type grep` printed "a shell function from ... shell-snapshots".
- Failing test: `tests/dotclaude/agents/roster.test.ts`.
  Input: each agent whose generated body names `Grep`.
  Expected: its `tools` lists `Grep` and leaves out `Bash`.
  Actual: it fails for all six.

### I16: the answer graders pass a list of all the files

- File: `delegation-related-grouped/case.yaml:19-34` and `delegation-related-split/case.yaml:19-34`.
- Command: `bun -e` checked the four answer patterns against one line that has all six scaffold paths.
- Output: `[ true, true, true, true ]`
- Failing test: `tests/dotclaude/evals/graders.test.ts`, as a `SAMPLES` entry.
  Input: the line of all six paths, as a failing sample.
  Expected: at least one grader fails.
  Actual: all four pass.

### I16: the `Agent` graders do not check the agent type

- File: `delegation-related-*/case.yaml:35-39` and `big-file-subagent/case.yaml:19-22`.
- Command: `grep -A4` for the three `Agent` graders, piped to `grep -c input_match`.
- Output: `0`
- So a `general-purpose` spawn passes "one investigator subagent".
- Failing test: `tests/dotclaude/evals/graders.test.ts`.
  Input: the `Agent` input `{"subagent_type":"general-purpose"}`.
  Expected: `one-subagent` fails.
  Actual: it passes.

### I15, a test of prose: `no-worktree-add.test.ts` checks words

- File: `tests/dotclaude/agents/no-worktree-add.test.ts:11,24-26`.
- Command: `bun -e` checked `WORKTREE_ADD` against `git -C . worktree add ../x`.
- Output: `false`
- No hook stops `git worktree add`.
  A `grep` of `worktree` in the slice code found only `spec` messages.
- Failing test: a lab test of a guard.
  Input: `git -C . worktree add ../x` from an agent.
  Expected: deny.
  Actual: no hook acts.

### I07, I02: `planner` can write outside `.dotclaude/spec/`

- File: `src/plugins/dotclaude/slices/agents/agents/planner.md:4,16`.
- Command: `grep -rn "planner" src/plugins/dotclaude/slices`
- Output: only `agents/slice.ts:11` and two skill texts.
  The only limit is the prose.
- Failing test: `tests/dotclaude/agents/`.
  Input: a `PreToolUse` `Write` from `planner` to `src/x.ts`.
  Expected: deny.
  Actual: allowed.
  The tool hooks of the kernel have no filter on the agent type, because only `agent.spawn` has `subagentType`.

### A bound outside its `limits.ts`: `REPORT_MAX_WORDS`

- File: `src/plugins/dotclaude/slices/handoff/limits.ts:17`.
- Command: `grep -rn REPORT_MAX_WORDS src tools`
- Output: `handoff/domain/context.ts:41` uses it, and so does `src/fragments/report-size.md:1` for all six agents.
  So two slices share it, and `CLAUDE.md` puts a shared bound in `src/kernel/budget.ts`.
- Failing test: `tests/dotclaude/import-rules.test.ts`.
  Input: `REPORT_MAX_WORDS`.
  Expected: an export of `budget.ts`.
  Actual: it is in `handoff/limits.ts`.

## Unconfirmed Findings

- I11, I17: `git worktree list | wc -l` gives `149`, and `.claude/worktrees` has 147 entries.
  These are left by `implementer` (`isolation: worktree`).
  No command shows that the slice must clean them up.
- `implementer.md:21` says "The working tree is shared", but `:7` gives the agent its own worktree.
- I17: `investigator` has no rule that a tool error is not a negative result.
  `researcher.md:37` has that rule.
- `roster.test.ts:15` cites the table of `workflow.md`.
  That table gives `debugger` Sonnet `high`, and the test pins Opus `medium`.

## Checked With No Finding

- I01, I03, I04, I05, I06, I09, I10, I12, I13, I14.
  P135 owns the models of I12.
- I18 model choice: `CLAUDE_CODE_SUBAGENT_MODEL` is `claude-sonnet-5-5`, and this `reviewer` run got `claude-opus-5-5` from its front matter.
- I07: `git stash` gets an ask from `asks/domain/git.ts:97`.
- Dead code: each fragment has a user.
- A copy of kernel code, a silent `catch`, and a test that cannot fail: none.

Checked: the brief, `design.md`, dossier `00-INDEX.md`, `CLAUDE.md`, `.claude/rules/tests.md`, the six agents, the fragments, the three evals, both test files, `graders.test.ts`, and `prompt/slice.ts:63`.
The run used `grep`, `git worktree list`, `type`, and two `bun -e` regex checks.
