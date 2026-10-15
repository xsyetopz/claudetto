# Spec System Redesign for 1.1.0 (Proposal)

This file proposes a new spec system that replaces the spec system of 1.0.0.
The user reads it and decides.
No code changed for it yet.
A `reviewer` read the first draft against the evidence, and this version fixes each of its findings.

## Sources

The notes with each quote and URL are in `/tmp/claude/sdd/` (outside the repository):

- `tools.md`: Spec Kit, OpenSpec, Spec Kitty, BMad Method, Superpowers, Kiro, and `cc-sdd`, from their repositories and docs.
- `research.md`: the five pages that the user named, and 11 arXiv papers.
- `sessions.md`: 14 sessions of dotclaude 1.0.0 from the last 3 days, in dotclaude and OpenJoystickDriver.
- `spec-1.0.0.md`: the inventory of the 1.0.0 spec system.

Some sources are weak: codemyspec.com and specs.md are vendor pages, the lifemichael.com page is ChatGPT output, and spec-compare is one opinion.
The blog quotes (Scott Logic, Fowler) are search snippets.

## What the Evidence Says

### Measured Results

- Spec documents alone give little.
  Spec Kit Agents (arXiv 2604.05278, 128 runs, 5 repositories) scored 3.46 with no spec files and 3.51 with them, at 2.25 times the time budget.
  Hooks with no spec scored 3.50.
  Spec files plus hooks that check each path and API of the plan against the repository scored 3.66 (p < 0.05 against 3.51).
  So the gain came from the documents and the checks together.
- A bad plan is worse than no plan: "A subpar plan hurts performance even more than no plan at all", and more early phases "can degrade performance" (arXiv 2604.12147, 21,120 runs).
- For strong models, a plan saves cost and does not change accuracy much (arXiv 2609.20804).
- Context files raise the cost by more than 20% and do not raise success in general (arXiv 2602.11988).
- Tests that the implementer writes are not sufficient: "38 passing unit tests coexisted with complete feature failure" (arXiv 2603.25697).
- A requirement id cited on each changed line lets a check find made-up lines (86% to 88%), but ids at a coarser level give 0% (arXiv 2606.30689).
  This design cites ids for each task only, so it does not get that effect.
- Specs of higher quality go with fewer bug-fix commits, 11.8% against 20.4% (arXiv 2610.07534, observational).
  A practitioner: "if [the agent] doesn't know it's done, it's going to be impossible for it to stop the harness loop".

### Where Spec Systems Fall Short

- spec-compare names no tool as best for an emergency fix or a prototype ("None"), and says to fix a bug in the code directly and update the spec later.
- Kiro made "4 user stories with a total of 16 acceptance criteria" for a small bug (Fowler).
- The review of many Markdown files "may exceed" the cost of the review of the code (spec-compare).
- Specs drift from the code when no check ties them together (an HN quote on OpenSpec).
- arXiv 2602.00180: "Use the minimum level of specification rigor that removes ambiguity for your context."

### What Each Tool Does Well

| Tool | Strength to take | Weakness to avoid |
| --- | --- | --- |
| OpenSpec | Living specs per capability plus a delta per change (`ADDED`, `MODIFIED`, `REMOVED`) with WHEN and THEN scenarios, merged by the CLI on archive. 3 core commands. `--json` on each command. | No check of code against the spec (issue #880). |
| Spec Kit | `[P]` markers for parallel tasks, and an "Independent Test" for each story. | 10 commands with about 2,000 lines of prompts, and a task is done when the model ticks a box. |
| Spec Kitty | Work packages with `owned_files` and `dependencies`, lanes computed from them, one worktree per lane. | 9 lanes and 27 transitions, more than 1,300 Python files, "probably overkill for one-off edits" (its README). |
| BMad Method | Paths by size: a small change is one `/bmad-build` with a plan file. Plan sections "Boundaries", "I/O and Edge-Case Matrix", and "Verification". | 33 skills, the largest prompt surface. |
| Superpowers | "Size the Work" first: only a project gets a written design. `scripts/task-done` records a task only when its test command exits 0. | No living spec and no archive. Plans that "over-specify implementation" (issue #895, 38 reactions). |
| Kiro and `cc-sdd` | EARS requirements ("When [event], the [system] shall [response]"). Approval flags in `spec.json`. | Too much text for small work (Fowler). |

### What Went Wrong in 1.0.0

- Calls on spec files or `dotclaude-spec` were 30% or more of the tool calls in 10 of 14 sessions (`sessions.md`, F9).
  The planning sessions count the work on the spec itself, so not each call is bookkeeping.
- The model wrote spec files around the CLI: 43 `Edit` calls in one session, a script that wrote waves and deps (F3), and a script that wrote `done` events in OpenJoystickDriver (session `44b42f2b`, line 168).
- A `verify:` field can hold prose, and `validate` accepts it (F5, P78, P146).
- `merge` runs `just generate` in each project with a `justfile` (P120).
- The start hook does not find the package id when the prompt does not start with the brief (P162).
- Agent worktrees start from an old commit (P161), and the uncommitted changes of the spec files are not in them.
  So the main session pastes each brief and each requirement into each prompt.
- The validator rejects two packages of one wave with the same paths, and the model then moves waves by hand (F4).
- The scale: 19 CLI commands, 7 skills, 7 package states, 7 change states, 4,556 lines of source, and 3,796 lines of tests.
  The live change 1.1.0 has 144 files and 9,906 lines, with 110 package files.
- The state of a package is in its front matter and again in `events.jsonl`, so two sources can disagree.

## Design Rules

1. Documents plus machine checks give the gain.
   Each field that a check can read is a field that a check reads: paths, commands, ids, deps.
2. The size of the work picks the amount of spec.
   A fix or a spike gets no spec files.
3. One source of truth for each fact.
4. Only the CLI writes a state, and a hook stops each other write.
5. A task is done only when its `verify` failed before the work and passed after it, at the commit that holds the work.
6. Fewer, shorter files for the model to read and for the user to review.
7. Each command has `--json` output, so an agent reads facts and does not parse prose.

## Proposed Design

### Three Levels

| Level | When | Files | Done when |
| --- | --- | --- | --- |
| `direct` | A fix, an emergency, a spike, a one-file change | none | the check of the work passes, as the prompt rules say now |
| `plan` | Work for one session, with a few steps | `.dotclaude/plans/<slug>.md` | each task passed its `verify` |
| `change` | Work over many sessions, or a change of behavior that other work depends on | `specs/` and `changes/<id>/` | each task passed, each review passed, and the archive merged the deltas |

The `decide` slice suggests the level from the size of the request, and the user can name a level.
REQ ids are needed only at the `change` level.

### File Layout

```text
.dotclaude/
  specs/<capability>.md          # the living spec: the current requirements
  changes/<id>/
    proposal.md                  # why, what, non-goals, impact
    specs/<capability>.md        # the delta: ADDED, MODIFIED, REMOVED requirements
    tasks/<group>.md             # the tasks, 300 lines or less for each file
    reviews/<n>.md               # the findings of each review
    notes/                       # evidence and research output, optional
  changes/archive/<date>-<id>/
  plans/<slug>.md                # the plan level: tasks with a short intent
```

A change has at most `CHANGE_MAX_TASKS` tasks (for example 30).
A larger body of work is two or more changes, so a review fits the context of one `reviewer`.
The 1.1.0 change becomes about five changes.

### Requirement Format

```markdown
### REQ-auth-3: Lock After Failed Logins
The system MUST lock the account after 5 failed logins in 10 minutes.
- WHEN 5 logins fail in 10 minutes THEN the 6th login is refused
- WHEN 10 minutes pass with no failure THEN the count starts again
```

An id has the capability in it, so it stays unique after the archive.

### Task Format

```markdown
## T3: Count Failed Logins [REQ-auth-3]
files: src/auth/lockout.ts, new: tests/auth/lockout.test.ts
after: T1
verify: bun test tests/auth/lockout.test.ts
state: open

Add the count of failed logins and the lock.
```

- `files` is the set of paths that the task can change.
  `new:` marks a path that the task makes.
  The project names shared files, such as `CHANGELOG.md`, in `.dotclaude/spec.json`, and those do not count as owned.
- Two ready tasks with a common path run one after the other, in the order of their numbers.
  A task can add itself to the queue only when no running task owns one of its paths.
- `kind` is `code` by default.
  `kind: research` writes a file under `notes/`, and `verify` checks it, for example `test -s notes/x.md && bun run lint:md`.
  `kind: ask` needs the approval of the user, such as a deletion of tags or a paid run.
  So no `verify` field holds prose.
- `state` is `open`, `running <branch>`, `done <sha>`, or `blocked: <note>`.
- The model can add a task during the work: it writes a new block with `state: open`, and `check` runs on it.

### Who Writes a State

- Only the CLI changes a `state:` line, and only the CLI writes `reviews/`.
- A `PreToolUse` hook of the `guard` slice denies an `Edit`, a `Write`, or a shell command that changes a `state:` line of a spec file.
  Other changes of the task files are allowed.
- The guard also denies a model call of `dotclaude-spec approve`.
  The user runs `! dotclaude-spec approve T5`, which Claude Code runs with no tool call, so only the user can approve a `kind: ask` task.
- `check` confirms that each `done <sha>` is a commit on the branch of the change, and that the `verify` of each `done` task passed at that commit, from the log of the CLI in `.git/dotclaude/`.

### The Life of a Task

1. `dotclaude-spec start T3` checks the task, runs its `verify` once on the current head, and needs a failure ("red").
   An exit status of 127 (command not found) or a pass stops the start with a message.
   So a prose `verify`, `true`, and `echo ok` fail at once.
   A task with `red: no` skips this step, such as a refactor that keeps the tests green.
   `start` sets `running <branch>` and commits the spec files, so each worktree has the current specs.
2. The `build` skill starts an `implementer` with the text of `dotclaude-spec show T3 --json`, which holds the task and the text of each REQ.
   `worktree.baseRef` (P161) makes the worktree from the current head.
   No hook parses the prompt, so the defect of P162 has no place.
3. `dotclaude-spec done T3 --in <worktree>` needs a clean worktree and no change outside `files`, runs `verify`, and on exit 0 merges the branch into the branch of the change.
   Then it writes `done <sha>` with the merge commit, and commits it.
   On a failure, the state stays `running`, and the output goes to the caller.
4. `dotclaude-spec block T3 --note <text>` records a block.

The `done` step runs only the commands of the project that `.dotclaude/spec.json` names, such as `generate`, and never a guessed recipe.

### Review

- `dotclaude-spec review <id>` gives the diff of the done tasks since the last review, with their deltas, to a `reviewer`.
- The `reviewer` returns findings, and each finding names a task.
- `dotclaude-spec review <id> --reject T3 --finding <text>` writes `reviews/<n>.md` and sets `T3` to `open` again.
  `--pass` writes the pass.
- A change can archive when each task is `done` and the last review passed.

### Checks of `dotclaude-spec check`

- Each path of `files` exists, or it has `new:`.
  The check runs for each task at its `start`, so a path that an earlier task removed does not fail a later task.
- Each REQ of a delta has at least one task, and each REQ that a task names exists.
- An `ADDED` id is not in the living spec, and a `MODIFIED` or `REMOVED` id is.
- Two open changes that modify one REQ give a warning.
- The `after` graph has no cycle.
- Each `done` state matches the log of the CLI.

### Commands

| Command | Does |
| --- | --- |
| `new <id>` | Makes the change folder from the templates. |
| `check [<id>]` | Runs the checks above. |
| `next [<id>]` | Gives the ready tasks. |
| `show <task>` | Gives a task with the text of its REQs. |
| `start <task>` | Runs the red check and sets `running`. |
| `done <task> --in <worktree>` | Runs `verify`, merges, and sets `done`. |
| `block <task> --note <text>` | Records a block. |
| `approve <task>` | The user approves a `kind: ask` task. |
| `review <id>` | Gives the diff for review, and records the result. |
| `archive <id>` | Merges the deltas into `specs/`, and moves the change to the archive. |
| `status` | Gives the counts and the ready tasks of each open change. |

Each command has `--json`.
11 commands in place of 19.
The `handoff` and `statusline` slices read `status --json` in place of `next` and the `merge` trigger.

### Skills

- `/dotclaude:spec`: writes a plan or a change from the request, and runs `check`.
- `/dotclaude:build`: runs the ready tasks, and calls `start` and `done` for each.
- `/dotclaude:review`: runs the review of a change, and archives it when it passes.

3 skills in place of 7.

## Migration of 1.1.0

Two options:

1. Finish 1.1.0 on the 1.0.0 system, and build the new system as its first part.
   The old system stays in use until the new one passes its own tests.
2. Convert 1.1.0 with a script in `tools/`, which is deleted after the run.
   Each `canceled` package stays out, each `done` package and each `verified` package that is in `main` becomes `done`, and each package with work in a worktree becomes `open` with the branch in a note.
   The requirements in `change.md` move to `specs/` with REQ ids.

The proposal is option 1, because the new system is not yet tested, and a script of one use is work that is lost after it.
The packages that fix the 1.0.0 system (P120, P146, P162, and the spec parts of P94, P161, and P164) are canceled, and the new system takes their findings as tests.

## Open Points for the User

1. Is the scope right: three levels, small changes, living specs, and one state line for each task?
2. Is the red check at `start` right, with `red: no` for the exceptions?
3. Is option 1 of the migration right?
