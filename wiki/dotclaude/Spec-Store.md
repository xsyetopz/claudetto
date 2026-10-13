# Spec Store

This page describes the spec store, which keeps the state of each change.
It is for a user who starts or resumes a change, and for a contributor who edits the `spec` slice.

The spec store keeps the state of a change in the repository.
A change has its reason, its tasks, its delta files, and, for a large change, its packages and a lane log.
A fresh session reads these files again.
So the work continues after `/clear`.
The reason for the store is in [Decisions-Tools](Decisions-Tools), decision D11.

The store is the folder `.dotclaude/spec/`, and git tracks it.
The `spec` skill starts a change.
The `dotclaude-spec` command writes the template files of a change, and it checks them.

dotclaude does not use OpenSpec.
The history of the OpenSpec flow is in [OpenSpec-History](OpenSpec-History).

## Sizes

| Size | Use it when | Files |
| --- | --- | --- |
| `trivial` | One edit has a command that shows that it is done. | `change.md`, with the tasks |
| `medium` | A change touches one or more capabilities. | `change.md`, and one delta file for each capability |
| `large` | Several agents do different parts. | The medium files, `design.md`, `packages.md`, `packages/`, and `events.jsonl` |

The default size is `medium`.
`dotclaude-spec new` writes `events.jsonl` only for a `large` change.

## Layout

```text
.dotclaude/spec/
  specs/                         the main spec of each capability, one file for each
  changes/<id>/
    change.md                    the reason, the scope, and the tasks
    specs/<capability>.md        the delta file of one capability
    design.md                    the design (large)
    packages.md                  the packages, under their waves (large)
    packages/NN-<slug>.md        the brief of one package (large)
    events.jsonl                 the lane log (large)
  changes/archive/<date>-<id>/   the archived changes
  hotfixes/                      the records of the hotfixes
```

The folder `specs/` does not exist in this checkout yet.
The `archive` command creates it when the first change is archived.

The id of a change is the name of its folder.
It uses letters, digits, `.`, `_`, and `-`.
It is not `archive`.
`archive <id>` rejects an id that does not follow this rule, and it changes nothing.

## Task and Delta Files

Each task in `change.md` is a line `- [ ] <id> <text>`.
Put a `Verify:` line below it, indented.
The `Verify:` line names a command or a test that shows that the task is done.
`validate` fails on a task with no `Verify:` line, with the rule `task.no-verify`.

A delta file has the sections `## ADDED`, `## MODIFIED`, `## REMOVED`, and `## RENAMED`.
A `RENAMED` section has `FROM:` and `TO:` lines.
Each requirement is a heading `### Requirement: <name>`, with one sentence that has `SHALL`.
Each requirement has one or more scenarios, as `#### Scenario: <name>`.
Each scenario has a `WHEN` line and a `THEN` line.
An `AND` line after a `WHEN` or a `THEN` line belongs to that scenario.
The spec store keeps each `AND` line as you write it, with its text and its indentation.
`validate` fails on a requirement without `SHALL`.
It also fails on a scenario without `WHEN` or `THEN`.

`archive` applies each delta file to the file of the same name in `specs/`.
A delta fails when it does not apply.
An example is an `ADDED` requirement that exists already.
When one delta fails, `archive` changes nothing.

When the archive is done, and only the removal of `.dotclaude/spec/.specs-old` fails, `archive` exits with `0`.
It names that folder on the error output.
Remove that folder by hand, because the next `archive` refuses to run while it exists.

## Package Files

Each package has a file `packages/NN-<slug>.md`, which is the brief of one agent.
The front matter has the keys `id`, `deps`, `owns`, `verify`, and `agent`.
The body has the sections `## Goal`, `## Context`, `## Steps`, `## Acceptance`, and `## Boundaries`.
`Context` names each file that the agent reads, with `file:line` references.

Each `owns` entry is a folder prefix or a file path, with no wildcard.
No `owns` entry is under `plugins/`, because `plugins/` is generated.
`validate` checks these rules, with the rules `package.owns-wildcard` and `package.owns-plugins`.
It also checks that each `deps` entry names a package, with `plan.dep-missing`.
It checks that no dep cycle exists, with `plan.dep-cycle`.

`packages.md` lists each package under a heading `## Wave <n>`, as `- [ ] <id> <name>`.
The packages before the first heading are in wave 0.
Two open packages of one wave have no overlapping `owns` entries.
One entry overlaps another when it is a prefix of the other.
`validate` reports an overlap with the rule `wave.owns-overlap`.

The checkbox of a package is `[x]` when its lane is `done`, and `[ ]` for each other lane.
Only `dotclaude-spec lane` sets the checkbox.
`validate` reports a checkbox that differs from its lane, with the rule `plan.checkbox-lane`.

## Lanes and `events.jsonl`

`events.jsonl` is an append-only log.
Its first line is a header, `{"schema":1}`.
Each next line is one lane change, such as `{"at":"<time>","package":"P01","lane":"doing"}`.
The lanes are `planned`, `doing`, `review`, `done`, `blocked`, and `canceled`.
`done` and `canceled` are terminal: a package in them does not move again.
The done count of a change, in `status` and in the status line, leaves out each `canceled` package.
The lane of a package is the lane on its last line.
A line can also have a `note`, the reason of the move, and a `verdict`, `approve` or `reject`, with its `findings`.
A package with a file in `packages/` and no line is `planned`.
`validate` fails on a line for a package with no file in `packages/`, with the rule `plan.event-no-package`.

The reader stops with an error that names the file when the `schema` is not `1`.
The number is `SPEC_SCHEMA` in `src/kernel/spec-store.ts`.

Three parts move a lane:

- The `lane` command adds a line, and it sets the checkbox in `packages.md`.
  It refuses in a linked git worktree, with exit status `1`.
  It also refuses a move out of `done` or `canceled`, and a move to the lane that the package has.
  A move to `blocked` and a move back need `--note <text>`.
  A move back goes to `planned`, or from `review` to `doing`.
  The `lane` command does not move a package to `canceled`, because `drop` does that with a reason.
  A package in `planned` may move to `doing`, `review`, `done`, or `blocked`.
  The `review` move covers a package whose `doing` hook failed.
  A refused move exits with status `1`, and it adds no line.
- The mod handler on `agent.spawn` in the `spec` slice moves a package to `doing`.
  It does this when `/ship` starts its `implementer`.
- The mod handler on `turn.complete` in the same slice moves a package to `review`.
  It does this when that `implementer` ends with the reason `answer`.
  Another end leaves the package in `doing`.

The `review` command records the verdict of a review on a package in `review`.
`approve` keeps the lane `review`.
`reject` needs one `--finding` or more, and moves the package to `doing`.
The `merge` command takes only a package whose last verdict is `approve`, with no move to `doing` after it, and sets the lane `done`.
`/ship` sets the lane `blocked`, with a note, when the retry of a package fails.
The `retry` command moves a package in `review` or `blocked` to `doing`, and prints its stored findings and the note of its block.
The `drop` command moves a package to `canceled`, with its reason as the note.

The file `.gitattributes` sets `merge=union` for `events.jsonl`.
Two branches that append lines to the log merge with no conflict.

## Commands

| Command | What it does |
| --- | --- |
| `dotclaude-spec new <id> [--size trivial\|medium\|large]` | Writes the files of the size. It fails when the change already exists. |
| `dotclaude-spec status [<id>]` | Prints the count of done packages, the count of each lane, and the lane of each package. |
| `dotclaude-spec next [<id>]` | Prints the brief of the first package in `packages.md` that is `planned` or `doing`, and whose deps are all `done`. |
| `dotclaude-spec show <id> [<package>]` | Prints the size and the lanes of a change, or the lane, the goal, the deps, the `owns`, the `verify`, and the last 5 events of one package. |
| `dotclaude-spec list` | Prints each open and archived change, with its size and the count of each lane. |
| `dotclaude-spec lane <package> <lane> [--note <text>]` | Moves a package to a lane, and adds one line to `events.jsonl`. |
| `dotclaude-spec review <package> approve\|reject [--finding <text>]...` | Records the verdict of a review. `reject` moves the package to `doing`. |
| `dotclaude-spec retry <package>` | Moves a package in `review` or `blocked` to `doing`, and prints its findings. |
| `dotclaude-spec drop <package> --reason <text>` | Moves a package to `canceled`. |
| `dotclaude-spec deps [<id>]` | Prints the packages of each wave with their deps, each chain that a `blocked` or `canceled` dep stops, and each `owns` overlap in one wave. |
| `dotclaude-spec log [<id>] [--package <package>]` | Prints the events of a change, one line for each event. |
| `dotclaude-spec ready [<id>]` | Prints the id of each package that can start now, in the order of `packages.md`. |
| `dotclaude-spec runs` | Prints the number of agent runs that a wave of `/ship` may start now. |
| `dotclaude-spec merge <package> <branch>` | Merges the branch of a package in the `review` lane with an `approve`, and sets the lane `done`. |
| `dotclaude-spec validate [<id>]` | Checks the capability specs, the tasks, the delta files, and the packages. |
| `dotclaude-spec archive <id>` | Applies the deltas, and moves the change to `changes/archive/`. |
| `dotclaude-spec record <text>` | Writes the record of a hotfix in `hotfixes/`. |

When the id is missing, `status`, `next`, `ready`, `deps`, and `log` use the active change.
The active change is the last change, in the order of its id, that has a package which is not `done` or `canceled`.
Each command from `show` to `log` in the table takes `--json`, and then prints JSON in place of the text.
`lane`, `review`, `retry`, `drop`, and `merge` run only in the main checkout.
The command exits with status `2` for a usage error.
It exits with status `1` for a failed command.
Run `dotclaude-spec` with no argument to print the usage.

`merge` stops with no change when the tree holds another change.
It commits the lane files of the change first, and then it merges the branch.
It runs `just generate` when the project has a `justfile`.
On a conflict, it stops, sets no lane, and prints each conflicted file.

`runs` reads the usage sample that the status line keeps in `RATE_LIMITS_FILE`, in `src/kernel/paths.ts`.
The cap is the value of `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, when it is a plain number of at least `1`.
Otherwise the cap is `SUBAGENTS_DEFAULT`.
A sample older than `USAGE_SAMPLE_MAX_MS` allows one run.
Each limit window with a known usage allows its share of the cap.
It also allows at least one run, unless the window is full.
When the count is `0`, a second line prints the reset time, when it is known.

## Work Across `/clear`

1. Run the `spec` skill with the id of the change and a size.
   The skill fills the files.
   It ends when `dotclaude-spec validate <id>` passes.
   It does not start the work.
2. For a medium change, the `Verify:` commands show when the work is done.
   For a large change, run `/ship <id>`.
3. `/ship` runs the open packages in the order of their deps.
   It runs `ready` to pick the packages, and `runs` to limit the agents of a wave.
   It starts an `implementer` agent for each package, in its own worktree.
   It starts a `reviewer` agent for each diff.
   The reviewer sees the brief and the diff, and it does not change a file.
   A package that fails gets one retry.
   The main session merges each package that passes.
   It asks the user before a push or an archive.
4. Before `/clear`, run `dotclaude-spec status <id>`.
   The state is in the lane log.
   So a fresh session needs no handoff file.
5. In the fresh session, run `dotclaude-spec next <id>`.
   It prints the brief of the next package, and the work continues there.
   The `handoff` slice runs the same command when it resumes a session.
   See [Context and Handoff](Context-And-Handoff).
6. When all the work is done, run `dotclaude-spec archive <id>`.
   The change moves to `changes/archive/<date>-<id>/`.
   `<date>` is the UTC date of the run.

## Hotfixes

A defect with a known cause does not need a change.
The `hotfix` skill fixes the defect, runs the check, and runs `dotclaude-spec record` with a text.
The record has the sections `## Cause`, `## Fix`, and `## Check`.
Its file name is the date, then the text in lowercase words joined with `-`.
The text is cut at `HOTFIX_SLUG_MAX` characters.
A second record on the same day gets the suffix `-2`, and so on.

## Zero Token Cost

These parts run with no model call:

- The `dotclaude-spec` command, which reads and writes files, and runs `git`, `bun`, and `just`.
- The mod handlers on `agent.spawn` and `turn.complete` of the `spec` slice.
  Their `evals` entries declare `requests: 0` and `tokens: 0`.
- The status line segment of the active change, which reads `activeProgress` from `src/kernel/spec-store.ts`.

These parts cost tokens:

- The `/spec`, `/ship`, and `/hotfix` skills, which the model runs.
- The `implementer`, `reviewer`, and `planner` agents.
- The handoff that can follow a lane change to `done`.
  The `handoff` slice can submit a prompt to Claude.
  Each prompt starts a model turn.
  See [Context and Handoff](Context-And-Handoff).

## Bounds

| Name | Value | File |
| --- | --- | --- |
| `SIZES` | `trivial`, `medium`, `large` | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `DEFAULT_SIZE` | `medium` | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `USAGE_SAMPLE_MAX_MS` | 600000 (10 minutes) | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `SUBAGENTS_DEFAULT` | 20 | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `HOTFIX_SLUG_MAX` | 40 | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `CHANGE_ID` | letters, digits, `.`, `_`, `-`, not `archive` | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `SPEC_SCHEMA` | 1 | `src/kernel/spec-store.ts` |
| `SHOW_EVENTS_MAX` | 5 | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `LANES` | `planned`, `doing`, `review`, `done`, `blocked`, `canceled` | `src/kernel/spec-store.ts` |

## Related Pages

- [Architecture](Architecture): the slices and the layout of the core plugin.
- [Agents](Agents): the agents that start the packages.
- [Skills](Skills): the skills that start and fill a change.
- [Status Line](Status-Line): the status line segment of the active change.
- [Decisions-Tools](Decisions-Tools): the decision behind the store.
