# Spec Store States

This page lists the states of a package and of a change, and the gate of each state change.
It is for a user who wants to know why the CLI refuses a command, and for a contributor who edits `domain/states.ts`, `domain/gates.ts`, or `domain/change-gates.ts`.
Read [Spec Store Files](Spec-Store-Files) first.

## Gates

A gate is a pure function of facts that the CLI collects.
The CLI refuses a state change when its gate fails, and it prints the reason.
When a gate passes, the CLI adds an event that records the evidence, such as the exit status and the SHA.
Only the main checkout changes a state.
A linked worktree can run `verify`, but not the other commands that change a state.

## Package States

| State | Next states | Command | Gate |
| --- | --- | --- | --- |
| `planned` | `doing`, `blocked`, `canceled` | `implement <package>` | The change is `planned` or `implementing`, each dep is `done`, and no marker is open. |
| `doing` | `doing`, `verified`, `blocked`, `canceled` | `verify <package>` | The `verify` command of the package exits with `0` at the head of its branch. The event records the command, the exit status, and the SHA. |
| `verified` | `approved`, `doing`, `blocked`, `canceled` | `review <package> approve`, or `reject --finding <text>...` | `approve` records the SHA of the verify event. `reject` needs a finding and a `--decision`. |
| `approved` | `done`, `blocked`, `canceled` | `merge <package> [<branch>]` | The head of the branch is the approved SHA. With no branch, `HEAD` of the main checkout contains that SHA. |
| `blocked` | `doing`, `canceled` | `implement <package> --note <text>` | A note. |
| `done`, `canceled` | none | none | none |

- `review` is a command and a phase, and it is not a state.
  A reviewed package is `verified` until `approve` moves it.
- A failed `verify` adds an event with its exit status, and the package stays `doing`.
  The next `implement <package>` then needs `--decision fix-code` or `--decision revise-spec`.
  A `reject` leaves the same choice.
- `approve` needs a last `verify` event with the exit status `0` and a SHA.
- `block <package> --note <text>` moves an open package to `blocked`.
- `drop <package> --reason <text>` moves an open package to `canceled`.
- An open package is a package that is not `done` or `canceled`.
- A package that depends on a `canceled` package does not become ready.
- `verify` fails when the head of the branch moves while the command runs, or when the run changes a file outside `.dotclaude/spec/`.

## Change States

| State | Command that moves to it | Gate |
| --- | --- | --- |
| `draft` | `specify <id> --size <size>`, which creates the change | The id is free. |
| `specified` | `specify <id>` on a change that exists | Each requirement has a valid ID, and no `[NEEDS CLARIFICATION]` marker remains. |
| `planned` | `plan <id>` | Each package passes its format check, each `REQ` of the change is in the `satisfies` of a package, and each `satisfies` ID exists. |
| `implementing` | the first `implement` of a package | none |
| `accepted` | `accept <id>` | Each package is `done` or `canceled`. |
| `archived` | `archive <id>` | The change is `accepted`. The requirements go into `specs/`. |
| `canceled` | `drop <id> --reason <text>` | A reason. |

- `drop <id> --reason <text>` cancels a change before it is `accepted`.
  It cancels each open package of the change first, with the same reason.
- For a `trivial` or a `medium` change, `specify <id>` also writes the one package `P1`.
  `P1` has each `REQ` in `satisfies` and the `verify` of the change.
  The change then goes from `specified` to `planned` with no `plan` step.
- `archive` merges the requirements of the change into `specs/`.
  It changes nothing when a requirement ID is in the spec already, or when two blocks of the change have the same ID.
  When a step fails, it puts back each file that an earlier step wrote.

## Related Pages

- [Spec Store Commands](Spec-Store-Commands): the commands that make these state changes.
- [Spec Store Choices](Spec-Store-Choices): the source of each gate.
