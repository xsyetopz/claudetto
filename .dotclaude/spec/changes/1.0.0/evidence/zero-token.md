# Zero token cost

The list of step 1 of P33: each task that dotclaude 1.0.0 gives to Claude, and that a hook, a script, a setting, or a status line command can do.
An `investigator` wrote it from the source on `dotclaude-1-0-0`, read-only, on 2026-10-12.
No cost here is measured.
Step 4 of P33 measures each one with `dotclaude-usage`.

## `packages.md` and `state.json`

- `state.json` is the only source that the product reads.
  `lane.ts` writes only `state.json`.
  `status`, `next`, `validate`, and the status line read the lanes from `state.json` (`src/kernel/spec-store.ts`, `slices/statusline/adapters/cli.ts`).
- No product code reads the checkbox of `packages.md`.
  `Entry.checked` (`slices/spec/adapters/plan-files.ts`) has only a test reader.
- On 2026-10-12, a script found no drift: each `[x]` is `done`, and each `[ ]` is not.
- `state.json` cannot come from the checkboxes, because a checkbox has 2 states and a lane has 5.
- The smaller change: `state.json` stays the only source.
  `dotclaude-spec lane` also writes the checkbox of the package line, `[x]` for `done` and `[ ]` for each other lane, in the same call.
  `validate` reports drift.

## Tasks

The rank is by the tokens that each session saves, estimated.

| # | Task | Where | Zero-token form | Needs from Claude Code | Cost now |
| --- | --- | --- | --- | --- | --- |
| 1 | Lane moves `doing` and `review` | `ship/SKILL.md` | A mod handler on `agent.spawn` and on the end of the subagent runs `dotclaude-spec lane` | Open: the package id in the `agent.spawn` input, an end event of a subagent, and `lane` refuses in a worktree | Medium: 2 calls for each package |
| 2 | Merge, generate, commit, lane `done` or `blocked` | `ship/SKILL.md` | `dotclaude-spec merge <pkg> <branch>`, which stops on a conflict and prints the files | Nothing | Medium to large: 4 or more calls for each package, with long outputs |
| 3 | Pick the ready packages | `ship/SKILL.md` | `dotclaude-spec ready <id>`, with the overlap logic of `validate.ts` | Nothing | Medium: 1 `Read` for each package in each wave |
| 4 | Tick the box of `packages.md` | `/spec` skill, by hand | `lane` writes it | Nothing | Small to medium, and a drift risk |
| 5 | Skills that run one command and copy its output: `usage`, `start-cost`, `eval-compare` | their `SKILL.md` | A `command.run` mod handler that returns the output with no model turn | Open: whether a handler answers a skill command with no model turn | Medium: 1 turn and the skill text |
| 6 | `setup` skill steps 2, 3, and 5 | `setup/SKILL.md` | A `command.run` handler for the preview, and `$.ui.ask` before the apply | Open: as 5, and `$.ui.ask` in place of `AskUserQuestion` | Medium, once for each install |
| 7 | The sections of a `hotfix` record | `hotfix/SKILL.md` | `record` writes the empty headings itself | Nothing | Small: 1 `Edit` |
| 8 | The `test-runner` agent | `agents/agents/test-runner.md` | A `dotclaude-run-checks` CLI that prints each command, exit status, counts, and failures | Nothing | Medium: its own context and up to 16 turns |
| 9 | The glob check of `/rules-creator` | `rules-creator/SKILL.md` | Already a script | Nothing | Small |
| 10 | The `decide` fallback through `$.model.complete` | `decide/adapters/mod.ts` | None: the fallback is correct, and it is not a turn of Claude | Nothing | Small, on the fallback only |

Not candidates:

- The texts of `prompt` and `surface` are a fixed cost of each session, not a mechanical step.
- The `docs` skill needs Claude to pick the library and the query.
- The `SessionStart` line of `dotclaude-codegraph` is already a hook.

## Open

- Items 1, 5, and 6 need the behavior of the mod events in a lab or a live session.
- Each cost needs a measurement.

## Verdicts of P33 part 2

- Item 5, `eval-compare`: the skill stays.
  A run costs money and takes minutes, so the skill confirms the two folders with the user first.
  The user can add `--scaffold` and `--allow-tools`, which run the scripts of the suite as the user, only after a named yes.
  A git ref must become a folder first.
  A handler has a time bound of 120 seconds, and has no such choices.
  `usage` and `start-cost` moved (`src/plugins/dotclaude-sessions/slices/*/adapters/mod.ts`).
- Item 6, `setup`: the skill stays the only path.
  A handler `onSetup` was built and removed.
  It asked before it showed the preview, so the consent was blind.
  It lost the path where the user drops some keys, the global installs of add-on tools, and the stop on a failed step.
  The saving is small, because `/setup` runs once for each install.

## Cost before and after

The moved items are 1, 2, 3, 4, 5 (`usage` and `start-cost` only), 7, and 8.
Item 6 and the `eval-compare` part of item 5 did not move.
Items 9 and 10 need no change.

The before counts come from the transcripts of this repository.
The `dotclaude-usage` CLI reads them, and its `--json` output lists the runs, the calls, and the cost by agent type.
The CLI does not split a run by token kind, and it does not isolate one model turn by its tool call.
So each before row counts the model calls that issued the named tool call, with the `usage` field of each request.
The counts run before the commit of each move, by the time in UTC.
The after column is 0 model tokens by design.
No live session measured it.

| Task | Before (runs, median tokens by kind, source) | After (model tokens, test with no model turn) |
| --- | --- | --- |
| 1. Lane moves `doing` and `review` | 29 calls that ran `dotclaude-spec lane` in Bash. Median `input` 2, `cache read` 67,178, `cache write` 742, `output` 16. | 0. `src/plugins/dotclaude/slices/spec/lab/ship-lane.test.ts`, "the spawn of an implementer moves its package to `doing`". |
| 2. `merge` | 4 calls that ran `dotclaude-spec merge`. Median `input` 2, `cache read` 67,572, `cache write` 891, `output` 12. | 0. `tests/dotclaude/spec/cli/merge.test.ts`, "merge merges the branch, runs the generator, commits plugins, and sets the lane done". |
| 3. `ready` | 56 calls that read a package file. Median `input` 2, `cache read` 11,969, `cache write` 1,153, `output` 124. | 0. `tests/dotclaude/spec/cli/ready.test.ts`, "ready prints the planned packages with done deps and no owns overlap with a busy package". |
| 4. Checkbox of `packages.md` | 16 `Edit` or `Write` calls on `packages.md`. Median `input` 2, `cache read` 138,711, `cache write` 1,816, `output` 1,388. | 0. `tests/dotclaude/spec/cli/lane.test.ts`, "lane sets the checkbox of the package line: x for done, a space for each other lane". |
| 5. `usage` and `start-cost` | The transcripts hold no run. A live run of the old skill measured `usage`, see [Live runs](#live-runs): 2 turns, `cache read` 30,828, `cache write` 6,615, `output` 822, $0.038. | 0. A live run of the same command took 0 turns and $0. `src/plugins/dotclaude-sessions/slices/usage/lab/usage.test.ts`, "the command `dotclaude-sessions:usage` shows the output of the CLI". `src/plugins/dotclaude-sessions/slices/start-cost/lab/start-cost.test.ts`, "the command `start-cost` shows the output of the CLI". |
| 7. Sections of a `hotfix` record | 6 `Edit` or `Write` calls on hotfix files. Median `input` 2, `cache read` 64,909, `cache write` 3,157, `output` 709. | 0. `tests/dotclaude/spec/cli/new-record.test.ts`, "record writes the empty sections of a hotfix in order". |
| 8. `test-runner` agent | The transcripts hold no run. 3 live runs measured it, see [Live runs](#live-runs): 2 turns each, $0.009 to $0.029. | Not 0. The main session still calls the CLI with `Bash`. 3 live runs took 3 to 8 turns, $0.032 to $0.036, see [Live runs](#live-runs). `tests/dotclaude/checks/run.test.ts` tests the CLI. |

Notes on the before rows:

- The transcripts hold no `ship` skill run.
  So the item 1 count includes the spec work of this branch, and it is not only the `ship` skill.
- The `dotclaude-spec` CLI is not in the base commit `d35fa5a6`.
  So the `lane`, `merge`, and `ready` calls before their commits are the spec work of this branch.
  Their counts are small, and they are estimates of the old form.
- The `/usage` command in the transcripts is the built-in command, not the skill.
- The item 3 count is the model calls that read a package file, not a count of waves.
- The `dotclaude-usage` run used `--days 400 --runs 1000`.
  Its count of calls moved while the session wrote, so it read 18,468 calls in the JSON form and 18,471 in the text form.

## Live runs

On 2026-10-12, headless runs in `just sandbox` measured items 5 and 8, because the transcripts hold no run of their old form.
Each run used `--model claude-sonnet-5-5` and `--allowedTools Bash Agent Task`, and the numbers come from the `modelUsage` of its result.
The old form ran from a worktree at `90ff82c1`, the commit before item 5 moved.
The new form ran from `33280eec`.
A new sandbox session starts each run, so the prompt cache is warm or cold by chance, and the cost varies.

| Run | Turns | Tokens by model (`cache read`, `cache write`, `output`) | Cost |
| --- | --- | --- | --- |
| Item 5 before, `/dotclaude-sessions:usage` as a skill | 2 | Sonnet 30,828, 6,615, 822 | $0.038 |
| Item 5 after, the same command with the `command.run` hook | 0 | none | $0 |
| Item 8 before, run 1, `test-runner` | 2 | Sonnet 30,404, 5,761, 250. Haiku 4,080, 4,410, 322 | $0.029 |
| Item 8 before, run 2 | 2 | Sonnet 30,409, 5,795, 241. Haiku 6,960, 1,463, 273 | $0.029 |
| Item 8 before, run 3 | 2 | Sonnet 35,592, 645, 244. Haiku 8,168, 253, 311 | $0.009 |
| Item 8 after, run 1, `dotclaude-run-checks` | 4 | Sonnet 66,811, 5,890, 571 | $0.036 |
| Item 8 after, run 2 | 3 | Sonnet 48,448, 5,726, 464 | $0.032 |
| Item 8 after, run 3 | 8 | Sonnet 128,861, 1,809, 1,176 | $0.032 |

The prompts:

- Item 5: `/dotclaude-sessions:usage`.
- Item 8 before: "Use the test-runner agent to run the check command bun --version, and report its result."
- Item 8 after: "Run the check command bun --version with dotclaude-run-checks, and report its result."

Item 5 moved to zero tokens.
Item 8 did not.
The new form costs more than the old form in these runs, for two reasons:

- No prompt, skill, or output style tells Claude that `dotclaude-run-checks` exists or how to call it.
  Each run first ran `which dotclaude-run-checks`, and run 3 also read the CLI source and the log folder.
- Each run first called `dotclaude-run-checks bun --version` with no quotes.
  The CLI reads each argument as one command, so it ran `bun` and `--version` as two commands.
  Each run then called it again with `"bun --version"`.

The `test-runner` agent ran on Haiku, so its own cost was at most $0.001 in each run.
Most of the cost of both forms is the main session on Sonnet.
