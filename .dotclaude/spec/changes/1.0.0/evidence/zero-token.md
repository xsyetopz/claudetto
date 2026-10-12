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
- Item 6, `setup`: moved.
  `$.ui.ask` exists at `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts:2436`:
  `ask: (question: string, options?: readonly string[] | AskOptions) => Promise<string>`.
  The handler `onSetup` in `src/plugins/dotclaude/slices/setup/adapters/mod.ts` answers `/dotclaude:setup [scope]`.
  It runs the previews of steps 2 and 3, asks two questions, and runs the apply of step 5.
  The skill stays for a call of the model, and for the global installs, because `dotclaude-setup addons` never runs one.
  The lab test `src/plugins/dotclaude/slices/setup/lab/setup-command.test.ts` stubs the `AskUserQuestion` call.
