# 1.0.0: Spec Store Schema 2

This file is the design of the spec store of 1.0.0, with no compatibility with schema 1.
The research is in `docs/research/spec-driven/01-sdd-sources.md`.
The decisions are in `change.md`, decisions, 2026-10-13.

## Principles

- Each state change has a gate that the CLI checks, and the event of the change records its evidence.
  Source: EPIC (arXiv 2610.07534), section 4.2.1: agents declare incomplete work finished, and mechanized checks are the blockers.
- Each requirement has a stable ID, and code cites the ID of its requirement on each non-trivial line.
  Source: `traceSDD` (arXiv 2606.30689), sections 6.1 and 6.3.
  Cost: per-line citations make the output less deterministic (section 5.2.1), so the plan accepts that cost for the orphan check.
- The research defines no states, so the states are the design of dotclaude.
- `events.jsonl` is the record of each state.
  The `status` key in the front matter of a file is a copy that only the CLI writes, so a reader sees the state in the file.

## Files

Each Markdown file of the store starts with front matter that has `schema: dotclaude-spec/2` and `kind`.

| File | `kind` | Front matter keys | Sizes |
| --- | --- | --- | --- |
| `changes/<id>/change.md` | `change` | `schema`, `kind`, `id`, `size`, `status`, `verify` | all |
| `changes/<id>/requirements/<capability>.md` | `requirements` | `schema`, `kind`, `capability` | medium, large |
| `changes/<id>/design.md` | `design` | `schema`, `kind`, `id` | large |
| `changes/<id>/packages/<package>.md` | `package` | `schema`, `kind`, `id`, `title`, `wave`, `deps`, `owns`, `satisfies`, `verify`, `agent`, `status` | all |
| `changes/<id>/events.jsonl` | none | the header `{"schema":2}` | all |
| `specs/<capability>.md` | `spec` | `schema`, `kind`, `capability` | the main specs |

- `packages.md` goes away.
  The `wave` and `title` keys of each package replace its list and its checkboxes.
- A trivial change holds its requirements in a `## Requirements` section of `change.md`.
- The `hotfixes/` folder and `dotclaude-spec record` go away.
  A small fix is a trivial change.

## Requirement IDs

- A requirement heading is `### REQ-<n>: <name>`, where `<n>` is a whole number that is unique in the store.
- `dotclaude-spec specify` gives the next free number: one more than the largest number in `specs/` and in each open change.
- An ID does not change, and a removed ID is not used again.
- A package lists the IDs that it does in `satisfies`.
- An open question is the marker `[NEEDS CLARIFICATION: <question>]` in any file of the change.

## Code Citations

- Each non-trivial line that a package adds or changes has a comment with the IDs of its requirements, such as `// [REQ-12]` or `# [REQ-12, REQ-14]`.
- A line is trivial when it is blank, a comment only, an import, or only brackets and punctuation.
- `dotclaude-spec trace` checks two things on the diff of a change, from its base commit to `HEAD`:
  - An orphan is a cited ID that no requirement has.
  - An uncited line is a non-trivial added line with no citation.
- The check reads only source files.
  It skips Markdown, JSON, lock files, and each path that `.gitattributes` marks `linguist-generated`.

## Package States

| State | Next states | Command | Gate |
| --- | --- | --- | --- |
| `planned` | `doing`, `blocked`, `canceled` | `implement <package>` | The change is `planned`, each dep is `done`, and no marker is open. |
| `doing` | `verified`, `blocked`, `canceled` | `verify <package>` | The `verify` command of the package exits with `0` at the head of its branch, and the event records the command, the exit status, and the SHA. |
| `verified` | `approved`, `doing` | `review <package> approve`, or `reject --finding <text>...` | `approve` records the SHA of the verify event. `reject` needs a finding and a `--decision fix-code` or `--decision revise-spec`. |
| `approved` | `done` | `merge <package> [<branch>]` | The head of the branch is the approved SHA. With no branch, `HEAD` of the main checkout contains that SHA. |
| `blocked` | `doing`, `canceled` | `implement <package> --note <text>` | A note. |
| `done`, `canceled` | none | none | none |

- A failed verify adds an event with its exit status, and the package stays `doing`.
  The next `implement <package>` then needs `--decision fix-code` or `--decision revise-spec`.
- `block <package> --note <text>` moves an open package to `blocked`.
- `drop <package> --reason <text>` moves an open package to `canceled`.

## Change States

| State | Command that moves to it | Gate |
| --- | --- | --- |
| `draft` | `specify <id> --size <size>`, which creates the change | The id is free. |
| `specified` | `specify <id>` on a change that exists | Each requirement has a valid ID, and no `[NEEDS CLARIFICATION]` marker remains. |
| `planned` | `plan <id>` | Each package passes its format check, each `REQ` of the change is in the `satisfies` of a package, and each `satisfies` ID exists. |
| `implementing` | the first `implement` of a package | none |
| `accepted` | `accept <id>` | Each package is `done` or `canceled`, and `trace` finds no orphan and no uncited line. |
| `archived` | `archive <id>` | The change is `accepted`. The deltas go into `specs/`. |
| `canceled` | `drop <id> --reason <text>` | A reason. |

- For a trivial or a medium change, `specify <id>` also writes the one package `P1`, with each `REQ` in `satisfies` and the `verify` of the change.
  The change then goes from `specified` to `planned` with no `plan` step.
  This is the short path that replaces `/hotfix`.

## Events

Each line after the header is one state change:

```json
{"at":"<time>","package":"P1","state":"verified","sha":"<sha>","verify":{"command":"just check","exit":0}}
```

- `package` is absent on the event of a change.
- The optional keys are `sha`, `verify`, `verdict`, `findings`, `decision`, `note`, and `model`.
- The reader stops on a header that is not `{"schema":2}`.

## Commands

The slash command and the CLI subcommand of a phase have the same verb.

| Phase | Slash command | CLI |
| --- | --- | --- |
| Specify | `/dotclaude:specify` | `dotclaude-spec specify` |
| Plan | `/dotclaude:plan` | `dotclaude-spec plan` |
| Implement | `/dotclaude:implement` | `dotclaude-spec implement`, `verify` |
| Review | `/dotclaude:review` | `dotclaude-spec review` |
| Merge | `/dotclaude:merge` | `dotclaude-spec merge` |
| Accept | `/dotclaude:accept` | `dotclaude-spec accept`, `trace` |
| Archive | `/dotclaude:archive` | `dotclaude-spec archive` |

- The utilities stay: `status`, `show`, `list`, `deps`, `log`, `validate`, `ready`, and `runs`.
- `block` and `drop` replace `lane`.
- `new`, `lane`, `retry`, and `record` go away, and `/spec`, `/ship`, and `/hotfix` go away.
- Each command takes `--json`, and each command that changes a state runs only in the main checkout.

## Hooks

- `agent.spawn` of an `implementer` with a brief runs `implement <package>`, as today.
- `turn.complete` no longer moves a package.
  `/dotclaude:implement` runs `verify` after the agent ends.
- The handoff trigger reads `merge` and `accept` in place of `lane <package> done`.
- The status line counts `done` packages of the active change, and leaves out `canceled` ones.

## The Store of This Repository

`.dotclaude/spec/changes/1.0.0/` is in schema 1.
P48 converts it once, with a script under `tools/` that P48 deletes after the run.
