# Spec Store Files

This page lists the files of the spec store, the keys of their front matter, the requirement IDs, and the events.
It is for a user who edits the files of a change, and for a contributor who edits the `spec` slice.
Read [Spec Store](Spec-Store) first.

## Layout

All paths are under `.dotclaude/spec/`.

| File | `kind` | Front matter keys | Sizes |
| --- | --- | --- | --- |
| `changes/<id>/change.md` | `change` | `schema`, `kind`, `id`, `size`, `status`, `verify` | all |
| `changes/<id>/requirements/<capability>.md` | `requirements` | `schema`, `kind`, `capability` | `medium`, `large` |
| `changes/<id>/design.md` | `design` | `schema`, `kind`, `id` | `large` |
| `changes/<id>/packages/<package>.md` | `package` | `schema`, `kind`, `id`, `title`, `wave`, `deps`, `owns`, `satisfies`, `verify`, `agent`, `status` | all |
| `changes/<id>/events.jsonl` | none | the header `{"schema":2}` | all |
| `specs/<capability>.md` | `spec` | `schema`, `kind`, `capability` | the main specs |
| `changes/archive/<date>-<id>/` | the same as above | the same as above | archived changes |

- Each Markdown file starts with front matter that has `schema: dotclaude-spec/2` and `kind`.
- A `trivial` change holds its requirements in a `## Requirements` section of `change.md`.
- The `wave` and `title` keys of a package give the order and the name of the package.
  No separate list of packages exists.
- The `status` key is a copy of the last state in `events.jsonl`.
  Only the CLI writes it, so a reader sees the state in the file.
  `dotclaude-spec validate` compares the key with the last event.
- A change that is `archived` moves to `changes/archive/<date>-<id>/`.
  `<date>` is the UTC date of the run.

## Package Keys

| Key | Meaning |
| --- | --- |
| `id` | The name of the package, such as `P1`. |
| `title` | A short name. |
| `wave` | The number of the wave. A package runs after the packages of the waves before it. |
| `deps` | The ids of the packages that must be `done` first. |
| `owns` | The paths that the package may change. Two open packages of one wave must not overlap. |
| `satisfies` | The requirement IDs that the package does. |
| `verify` | The command that must exit with `0` at the head of the branch. |
| `agent` | The agent that does the package. |
| `status` | The state of the package. |

## Requirement IDs

- A requirement heading is `### REQ-<n>: <name>`.
  `<n>` is a whole number that is unique in the store.
- `dotclaude-spec specify` gives the next free number.
  It is one more than the largest number in `specs/` and in each open change.
- An ID does not change, and a removed ID is not used again.
- A package lists the IDs that it does in `satisfies`.
- An open question is the marker `[NEEDS CLARIFICATION: <question>]` in any file of the change.
  While a marker is open, `specify` and `implement` refuse to move the state.

## Events

`events.jsonl` holds the history of each state.
The first line is the header `{"schema":2}`.
Each line after it is one state change:

```json
{"at":"<time>","package":"P1","state":"verified","sha":"<sha>","verify":{"command":"just check","exit":0}}
```

- `package` is absent on the event of a change.
- The optional keys are `sha`, `verify`, `verdict`, `findings`, `decision`, and `note`.
- `verify` holds the command and the exit status.
  `decision` is `fix-code` or `revise-spec`.
- A failed `verify` adds an event with its exit status, and the package stays `doing`.
- The reader stops on a header that is not `{"schema":2}`.
- `dotclaude-spec log` prints the events.

## Related Pages

- [Spec Store States](Spec-Store-States): the states and the gates that these events record.
