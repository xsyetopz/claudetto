# Design: claudetto from first principles

This file continues [`design.md`](design.md) and [`design-trim.md`](design-trim.md).
The user asked on 2026-10-17 for a redo of all of claudetto in this plan.
D12 and D13 stay, and this file adds the parts that they do not name.

## Facts of 2026-10-17

- `src/` has 40,976 lines of `.ts` in 460 files and 571 `.md` files, and `tests/` has 29,991 lines of `.ts`.
- Lines of `.ts`, files, files under 15 lines, and `.md` files of each part (`find <part> -name '*.ts'`):

| Part | Lines | Files | Under 15 | `.md` |
| --- | --- | --- | --- | --- |
| `asks` | 4468 | 35 | 1 | 52 |
| `policy` | 4259 | 34 | 3 | 28 |
| `tools/` | 3417 | 44 | 2 | 0 |
| `claudetto-sessions` | 3223 | 39 | 9 | 21 |
| `setup` | 3014 | 35 | 1 | 78 |
| `handoff` | 2558 | 20 | 0 | 24 |
| `claudetto-lab` | 2462 | 31 | 7 | 20 |
| `src/kernel/` | 2258 | 40 | 8 | 28 |
| `prompt` | 1764 | 25 | 3 | 88 |
| `statusline` | 1684 | 19 | 0 | 0 |
| `claudetto-you-should-know` | 1607 | 13 | 2 | 9 |
| `decide` | 1557 | 20 | 1 | 35 |
| `guard` | 1491 | 18 | 1 | 4 |
| `minispec` | 1327 | 16 | 1 | 59 |
| `attribution` | 1197 | 11 | 0 | 11 |
| `turngate` | 1165 | 10 | 0 | 14 |
| `claudetto-browser` | 1030 | 10 | 3 | 15 |
| `gc` | 1010 | 7 | 0 | 1 |
| `repostate` | 987 | 8 | 0 | 8 |
| `claudetto-codegraph` | 730 | 10 | 1 | 10 |
| `sembr` | 701 | 5 | 0 | 0 |
| `reads` | 609 | 6 | 1 | 3 |
| `worktree` | 432 | 9 | 1 | 5 |
| `checks` | 379 | 7 | 2 | 1 |
| `usercheck` | 259 | 5 | 1 | 1 |
| `surface` | 239 | 9 | 4 | 3 |
| `agents` | 226 | 5 | 0 | 8 |
| `corrections` | 175 | 5 | 1 | 1 |
| `trim` | 92 | 2 | 1 | 0 |
| `claudetto-docs` | 32 | 3 | 3 | 2 |
| `styles` | 13 | 1 | 1 | 1 |

- No slice imports another slice, and no plugin imports another plugin.
  Each cross-folder import goes to `src/kernel/`.
- Claude Code answers a repeated `Read` of an unchanged file with a stub: "File unchanged since last read" (`external/cc-2.1.302/strings.txt:334924`).
  The `reads` slice denies the same call with its own text.
- `turngate` and `usercheck` both register a `Stop` hook.
- A subagent inventory of 2026-10-17 counted uses with `grep -F` of common words, such as `guard`, and gave its report at the 400-word cap of `REPORT_MAX_WORDS`.
  This plan uses its import facts only.

## Decisions

### D39. Each part has one job, and a part goes when it has none or a built-in does it

The user picked a rewrite of every part on 2026-10-17 ("every part").
So each part that keeps its job is rewritten by D40, and no part stays as it is.
The call says what happens to the job of each part:

| Part | Job | Call |
| --- | --- | --- |
| `prompt`, `surface`, `trim`, `styles` | a short context for each model | rewrite, D17 |
| `handoff` | a handoff in place of the compaction summary | rewrite, D34 |
| `reads` | deny a repeated `Read`, keep a rejected call rejected | remove the repeated-`Read` deny, keep the rest only if no built-in does it |
| `asks`, `guard` | ask before a call that discards work, deny a print-only `Bash` | rewrite after the moves of D12, D35, D43 |
| `policy` | gate a contribution to a repository with an AI policy | rewrite |
| `repostate` | the git state, and an ask before a guess about a version or a package | rewrite, D12 |
| `turngate`, `usercheck` | proof at the end of a turn, and the `!` command of a check | merge into one `Stop` hook, D32, D36 |
| `checks` | run a batch of checks with no model turn | rewrite |
| `setup`, `statusline` | the snippet, the drift check, and the status line | rewrite, D4, D12 |
| `agents`, `minispec`, `decide` | the agents, the plan workflow, and the opt-in second opinion | rewrite, D2, D3, D9, D33 |
| `gc` | sweep the outputs of sessions outside the project | remove, Claude cleans up after itself, D44 |
| `sembr` | one sentence on each line of Markdown | rewrite, D12 |
| `worktree`, `attribution`, `corrections` | done by built-ins | remove, D12 |
| `claudetto-you-should-know` | one note above the prompt | rewrite, D1 |
| `claudetto-sessions`, `claudetto-lab` | measures of sessions, and tools for plugin authors | rewrite |
| `claudetto-browser`, `claudetto-codegraph`, `claudetto-docs` | a browser, the code graph, and library docs | rewrite |
| `src/kernel/`, `tools/` | the shared runtime and the repository scripts | rewrite last, to what the parts use |

### D40. Each rewrite starts from a behavior table, and its size is pinned after

- Jev picked `ceiling-after-behavior-table` at confidence 0.80, over fixed ceilings now at 0.11.
- D40 applies to every part of the table of facts, the add-ons, `src/kernel/`, and `tools/` included.
- Before a part changes, its behavior table lists each input of its tests with the old decision.
  The rewrite keeps each row, or a decision of this plan removes the row by name.
  This follows the Bun lesson of `design-evidence.md`: the same text can decide differently.
- The rewrite is the smallest code that passes the table.
  Its line count must be lower than the count in the table of facts above, which answers the weak point of the pick.
- After the rewrite, `tools/limits.ts` pins the line count of the part, and `just validate` fails when the part grows past it.

### D41. A folder or a file exists only when it holds a concern

- A part has a `domain/`, `adapters/`, or `prompts/` folder only when the folder holds two files or more.
- A file under 15 lines merges into the file that uses it, except an entry point that Claude Code or the generator needs.
- A prompt fragment that one prompt uses goes into that prompt, in each part, not only in `setup` (D12).
- The 300-line bound of each file stays.

### D45. The model knows its usage with no tool call

- Claude Code gives a status line `context_window`, `cost`, and `rate_limits` with `five_hour`, `seven_day`, and `spend_limit` (`external/cc-2.1.302/docs/statusline.md:182-198`).
  The status line shows them to the user, and the model does not see them.
- The mod event `session.measure` runs "After each turn, and when a plan limit's percent used changes" (`plugins_mods_reference.md:142`).
  The `awareness` hook of `claudetto-sessions` reads `rateLimits` there and makes no model call and no tool call.
  It gives the model one note when the seven-day share reaches `WEEKLY_WARN_PERCENT`, after the result of the next call that ran.
- In `0.2.0` the note covers each limit that binds the account: the five-hour and the seven-day share for a plan, and `spend_limit` for an API key.
  The model gets one note for each limit when its share crosses a bound, and no text below the bound, so a normal session costs 0 tokens.
- Other hook inputs that carry cost stay with their hooks: the cache write estimate of `SessionStart` on a resume and of `PreModelSwitch`, and the run telemetry of a subagent in `PostToolUse` of `Agent` (`hooks.md:1240`, `:3390`, `:1884`).
  The status line row of a subagent (D4) shows that telemetry to the user.

### D42. One `Stop` hook for the end of a turn

- `usercheck` merges into `turngate`, so one `Stop` hook gives one reason at most.
- The `!` command of D36 is one row of the turn gate.
