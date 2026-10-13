# Worker lessons

This file holds each lesson of the Bun port to Rust that P35 uses.
For each lesson it gives the form that the lesson takes at the scale of a subscription, or the reason that it does not apply.
The scale of the port is the API scale.
The scale of dotclaude is a subscription with a 5h window and a weekly window.

The facts of the port come from the entry of P35 in `packages.md`, and from the source that the entry names.
The numbers of the port are not checked again here.

## Lessons

### 1. Review by a second run

- The port gave each task one implementer, two reviewers, and one fixer.
  The reviewers saw only the diff, and they assumed that it was wrong.
- Form at subscription scale: one `reviewer` runs on the diff of each package before the merge.
  It gets the package file and the diff, and no report of the implementer.
  The `implementer` fixes each confirmed finding.
  The `reviewer` does not fix, so a fix never hides a finding.
- Cost: a second reviewer doubles the review runs of a package.
  Only one reviewer runs, because the windows of a subscription limit the runs.
- Step 3 of P35 implements this form.

### 2. Shared git state breaks parallel work

- Workers that ran `git stash`, `git stash pop`, and `git reset HEAD --hard` at the same time broke the work of each other.
  The port fixed this with a rule that forbids the commands.
- Form at subscription scale: the `guard` slice denies, in a subagent, `git stash` in each form, `git reset --hard`, `git clean`, and a `git checkout` or `git restore` of a revision over a whole folder.
  The deny reason says to commit the work to set it aside.
  The main session keeps its asks.
- A subagent that sets work aside by a commit does not lose it, because the commit stays in the branch.
- Step 4 of P35 implements this form.

### 3. A checkout over a folder overwrote the work

- On 2026-10-12, a `git checkout <rev> -- .` in the main session wrote old files over the checkout.
  The work was committed, so a restore from `HEAD` fixed it.
- Form at subscription scale: the same deny of step 4 covers a subagent.
  The main session keeps the asks that it has now.
- Commit each step before the next one starts, so that a restore from `HEAD` always has the work.

### 4. Many runs at once

- At the peak of the port, about 64 Claude sessions ran in 4 worktrees.
- Form at subscription scale: the count of runs in one wave comes from the tier cap and the usage now.
  The tier cap is `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` of the tier from P24, which is 5 for Pro and an API key, 10 for Max 5x, and 20 for Max 20x.
  `/ship` adds no second cap.
  Below the cap, the usage of the `five_hour` and `seven_day` windows gives the count.
- The weekly limit of Max 20x is only about 1.2 to 1.7 times that of Max 5x, but its 5h limit is much larger (the user, 2026-10-12).
  So for Max 20x the weekly window is the limit, and for a smaller tier the 5h window often is.
- Step 5 of P35 implements this form.

### 5. A run stops at its turn limit with no report

- On 2026-10-12, 4 subagent runs stopped at the turn limit with no report: P29, P34, and two runs of P13.
- Form at subscription scale: the note of P13 tells a subagent to report when it nears its `maxTurns`.
  The bound `TURNS_LEFT_AT` in `src/plugins/dotclaude/slices/handoff/limits.ts` sets how near it is.
  The bound leaves turns for the commit of the work and for the report.
- Step 2 of P35 sets the bound.

### 6. API cost does not apply

- The port took 11 days and about $165,000 at API prices.
- Form at subscription scale: the cost is not a money bound.
  The bound is the usage of the windows, and the count of runs of step 5 follows it.
- This lesson does not change any code.

## Open evidence

- The turns that a report and a commit take come from the transcripts of the runs of 2026-10-12.
  A read of those transcripts was refused by the permission system, so step 2 uses a bound that the reasoning gives.
  The bound is open until the transcripts give the count.
- The Verify of P35 asks for a lab test of the subagent deny and of the report note in a subagent.
  A lab test cannot make a `tool.call` of a subagent: `ToolCallArgs` documents that `agentId` is dropped (`plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`, lines 12645 to 12652).
  On 2026-10-13, a probe tried two routes.
  A stubbed `turn.step` with an `agentId` fired no `tool.call`.
  A `$.tool.call` with an `agentId` reached the handler only through a cast, so a test on it would pin the lab and not Claude Code.
  So both items have tests at the adapter: `tests/dotclaude/guard/shared-git.test.ts` and `tests/dotclaude/agents/report-note.test.ts`.
