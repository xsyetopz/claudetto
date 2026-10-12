---
id: P35
deps: [P13, P33]
owns: [".dotclaude/spec/changes/1.0.0/evidence/worker-lessons.md", "src/plugins/dotclaude/slices/guard/", "tests/dotclaude/guard/", "src/plugins/dotclaude/slices/agents/", "tests/dotclaude/agents/", "src/plugins/dotclaude/slices/spec/skills/ship/", "src/plugins/dotclaude/slices/handoff/limits.ts", "src/plugins/dotclaude/slices/statusline/", "tests/dotclaude/statusline/"]
verify: just check
agent: implementer
---

# P35 Worker lessons

## Goal

The subagent runs of dotclaude use the lessons of the Bun port to Rust, at the scale of a subscription and not of the API.
Each step fits one run, one `reviewer` reads only the diff of a package, a subagent cannot run a git command that changes shared state, and few runs go at once.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md`, P35.
- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-12.
- The source: [Bun in Rust](https://bun.com/blog/bun-in-rust).
  The port took 11 days and about $165,000 at API prices.
  Each task had one implementer, two reviewers that saw only the diff and assumed that it was wrong, and one fixer.
  At the peak, about 64 Claude sessions ran in 4 worktrees.
  Workers that ran `git stash`, `git stash pop`, and `git reset HEAD --hard` at the same time broke the work of each other, and a rule that forbids them fixed it.
- On 2026-10-12, 4 subagent runs of this change stopped at the turn limit with no report: P29, P34, and two runs of P13.
- On 2026-10-12, a `git checkout <rev> -- .` in the main session wrote old files over the checkout.
  The work was committed, so a restore from `HEAD` fixed it.
- P13 adds the note to a subagent near its turn limit, with the bound `TURNS_LEFT_AT` in `src/plugins/dotclaude/slices/handoff/limits.ts`.
- The tiers (P24): `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` is 5 for Pro and an API key, 10 for Max 5x, and 20 for Max 20x (`src/plugins/dotclaude/slices/setup/limits.ts:13-18`).
- The weekly limit of Max 20x is only about 1.2 to 1.7 times that of Max 5x, but its 5h limit is much larger (the user, 2026-10-12).
  So for Max 20x the weekly window is the limit, and for a smaller tier the 5h window often is.
- An example from the user on 2026-10-12 at 19:56: the 5h window was 16% used, with its reset at 22:30.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Write `.dotclaude/spec/changes/1.0.0/evidence/worker-lessons.md`: each lesson of the source, and the form that it takes at the scale of a subscription, or why it does not apply.
2. Turn limit: set the bound of the note of P13 so that a subagent has the turns to commit and to hand back a report.
   Find from the runs of 2026-10-12 how many turns a report needs.
3. Review: `/ship` runs one `reviewer` on the diff of each package before the merge.
   It gives the reviewer the package file and the diff, and no report of the implementer.
   An `implementer` fixes each confirmed finding, and the reviewer does not fix.
4. Shared git state: the `guard` slice denies, in a subagent, `git stash` in each form, `git reset --hard`, `git clean`, and a `git checkout` or `git restore` of a revision over a whole folder.
   The deny reason says to commit work to set it aside.
   The main session keeps the asks that it has now.
5. Parallel runs: `/ship` starts each wave with a count of runs that comes from the account and the usage now, and not from one fixed value.
   - The cap is the `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` of the tier from P24, and `/ship` adds no second cap.
   - Below the cap, the count comes from the `five_hour` and `seven_day` windows of `rate_limits`, which Claude Code gives the status line: the percent used, and the time to the reset.
   - The `statusline` slice keeps the last `rate_limits` in the runtime folder of `.dotclaude/`, and the `dotclaude-spec` CLI reads it, with no model call.
   - The rule of the count is a pure function with tests for each tier, and for a full and an empty window of each kind.
6. Write the tests of Acceptance.

## Acceptance

- `just check` passes.
- A lab test for each git command of step 4 shows a deny in a subagent and no deny in the main session.
- A lab test shows that a subagent gets the note before its last turn, with the bound of step 2.

## Boundaries

- Change only the paths of `owns`.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
