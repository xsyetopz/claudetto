# Spec store

dotclaude turns compaction and auto memory off, so `/clear` is the only reset of a long session.
The spec store keeps the state of long work in the repository.
A change has its reason, its tasks, its delta specs, and, for a large change, its packages and a lane log.
A fresh session after `/clear` reads these files again, and nothing is lost.

This page replaces the OpenSpec workflow of earlier versions.
dotclaude no longer uses OpenSpec.

The store is the folder `.dotclaude/spec/`, and the repository tracks it.
The `spec` skill starts a change.
The `dotclaude-spec` command writes the template files and checks them.

## Sizes

| Size | Use it when | Files |
| --- | --- | --- |
| `trivial` | One edit has a command that shows that it is done. | `change.md`, with the tasks |
| `medium` | A change touches one or more capabilities. | `change.md`, and one delta file for each capability |
| `large` | Several agents do different parts. | The medium files, `design.md`, `packages.md`, and `packages/` |

The default size is `medium`.

## Layout

```text
.dotclaude/spec/
  specs/                      the main specs, one file for each capability
  changes/<id>/
    change.md                 the reason, the scope, and the tasks
    specs/<capability>.md     the delta files of the capabilities
    design.md                 the design (large)
    packages.md               the packages, under their waves (large)
    packages/NN-<slug>.md     one file for each package (large)
    events.jsonl              the lane of each package, one line for each change (large)
  changes/archive/            the finished changes, with the date in the name
  hotfixes/                   the records of the hotfixes
```

Each task in `change.md` is a line `- [ ] <id> <text>`, with a `Verify:` line below it.
Each `Verify:` line names a command or a test that shows that the task is done.
`validate` fails on a task that has no `Verify:` line.

## Commands

| Command | What it does |
| --- | --- |
| `dotclaude-spec new <id> [--size trivial\|medium\|large]` | Writes the files of the size. It stops when the change exists already. |
| `dotclaude-spec status [<id>]` | Prints the lane of each package of the change. |
| `dotclaude-spec next [<id>]` | Prints the brief of the first package that is `planned` or `doing`, with each dependency `done`. |
| `dotclaude-spec lane <package> <lane>` | Moves a package to a lane and adds one line to `events.jsonl`. The lanes are `planned`, `doing`, `review`, `done`, and `blocked`. Only the main session runs it. |
| `dotclaude-spec ready [<id>]` | Lists the packages that can start now. Their `owns` do not overlap the `owns` of a package in `doing` or `review`. |
| `dotclaude-spec runs` | Prints the number of agent runs that a wave of `/ship` may start now. |
| `dotclaude-spec merge <package> <branch>` | Merges the branch of a package that is in the `review` lane. |
| `dotclaude-spec validate [<id>]` | Checks the specs, the deltas, the tasks, and the packages. It also checks that no two open packages of a wave have overlapping `owns`. |
| `dotclaude-spec archive <id>` | Applies the deltas to the main specs, and moves the change to `changes/archive/`. When one delta fails, nothing changes. |
| `dotclaude-spec record <text>` | Writes the record of a hotfix in `hotfixes/`. |

Run the command with no argument to print the usage.

## Work across `/clear`

1. Run the `spec` skill with the id of the change and a size.
   The skill fills the files, and it ends when `dotclaude-spec validate <id>` passes.
2. For a medium change, the `Verify:` commands show when the work is done.
   For a large change, run `/ship <id>`.
   The `/ship` skill starts an `implementer` agent for each package in a worktree, and a `reviewer` agent for each diff.
3. Before `/clear`, read the lanes with `dotclaude-spec status <id>`.
   The state is in the lane log, so a fresh session needs no handoff file.
4. In the fresh session, run `dotclaude-spec next <id>`.
   It prints the brief of the next package, and the work continues there.
5. When all the work is done, run `dotclaude-spec archive <id>`.

## Hotfixes

A defect with a known cause does not need a change.
The `hotfix` skill fixes it, runs the check, and runs `dotclaude-spec record` with a text.
The record goes to `.dotclaude/spec/hotfixes/`.

## Measured flow

This section records a measurement of the removed OpenSpec flow.
It does not describe the spec store.
On 2026-10-07, OpenSpec 1.14.1 and Claude Code 2.1.292 ran in `just sandbox` with `-p`.
A fresh session after `/clear` continued at the first unchecked task of the change, and it did not do that task again.
The result is the evidence for the resume after `/clear` in the open items.

## Related pages

- [Core plugin](Core-Plugin)
- [Agents](Agents)
