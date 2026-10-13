# Spec Store Commands

This page describes each subcommand of `dotclaude-spec`.
It is for a user who runs the CLI or reads its output, and for a contributor who edits `adapters/`.
Read [Spec Store States](Spec-Store-States) first.

Each command takes `--json` where the usage line shows it.
A command that changes a state runs only in the main checkout.
Run `dotclaude-spec` with no argument to print the usage.

## Phase Commands

| Command | What it does |
| --- | --- |
| `specify <id> [--size trivial\|medium\|large] [--capability <name>]` | On a free id, creates the change in `draft`. On a change that exists, checks the gate and moves it to `specified`. |
| `plan <id>` | Checks the packages against the requirements and moves the change to `planned`. |
| `implement <package> [--note <text>] [--decision fix-code\|revise-spec]` | Moves a package to `doing`, and records the SHA. |
| `verify <package> [--in <dir>]` | Runs the `verify` command of the package with `sh -c` in `<dir>`, and records the result. |
| `review <package> approve\|reject [--finding <text>]... [--decision fix-code\|revise-spec]` | Records the verdict. |
| `merge <package> [<branch>]` | Checks the approved SHA and moves the package to `done`. |
| `accept <id>` | Checks that each package is `done` or `canceled`, and moves the change to `accepted`. |
| `archive <id>` | Merges the requirements into `specs/` and moves the change to `archive/`. |

- `<dir>` of `verify` must be a worktree of this repository.
  The default is the root.
- `verify` writes its event to the main checkout.
  Exit status `0` gives `verified`, and any other status keeps the package in `doing`.
- `implement` reads the `[NEEDS CLARIFICATION]` markers and the deps, as [Spec Store States](Spec-Store-States) shows.

## Stop Commands

| Command | What it does |
| --- | --- |
| `block <package> --note <text>` | Moves an open package to `blocked`. `implement <package> --note <text>` starts it again. |
| `drop <package\|change> --reason <text>` | Cancels a package, or a change before it is `accepted`. When a folder with the name exists in the store, the name is a change. Otherwise the name is a package. |

## Read Commands

| Command | What it prints |
| --- | --- |
| `status [<id>]` | The states of the packages of a change. |
| `next [<id>]` | The brief of the next package. |
| `show <id> [<package>]` | A change, with its size, its status, and the state of each package. A package shows its goal, its deps, its `owns`, its `verify`, and its last events. |
| `list` | The open and the archived changes, with the size, the status, and the state counts. |
| `deps [<id>]` | The wave graph, the blocked chains, the `owns` overlaps, the missing deps, and the cycles. |
| `log [<id>] [--package <package>]` | The events of a change, one line for each event. |
| `ready [<id>]` | The packages that can start now. |
| `runs` | The number of agent runs that a wave may start now. |
| `validate [<id>]` | Checks the files of the open changes and the capability specs. |

- With no id, `status`, `next`, `deps`, `log`, and `ready` read the active change.
- A package is ready when it is `planned`, each dep is `done`, and its `owns` do not overlap the `owns` of a package in `doing`, `verified`, or `approved`.
  The printed set has no overlap.
- When `runs` prints `0`, a second line gives the time when the count becomes more than `0`.
- `validate` checks the front matter, the `status` of each file against its last event, the requirement IDs, the sections of each package, the deps, and the `owns` of the open packages in one wave.

## Related Pages

- [Spec Store Choices](Spec-Store-Choices): the source of each choice.
- [Skills](Skills): the seven skills that run these commands.
