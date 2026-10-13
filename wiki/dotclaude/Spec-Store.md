# Spec Store

This page is the start of the guide to the spec store.
It is for a user who starts or resumes a change, and for a contributor who edits the `spec` slice.
Read it first, then read the pages that [Related Pages](#related-pages) lists.

The spec store keeps the requirements and the state of each change in the repository.
A fresh session reads these files again, so the work continues after `/clear`.
The reason for the store is in [Decisions-Tools](Decisions-Tools), decision D11.

The store is the folder `.dotclaude/spec/`, and git tracks it.
The `dotclaude-spec` command writes the files of a change and checks them.
Seven slash commands, one for each phase, fill the files and run the command.
This is schema 2, and it has no compatibility with schema 1.
A reader stops on a store with another schema.

dotclaude does not use OpenSpec.
The history of the OpenSpec flow is in [OpenSpec History](OpenSpec-History).

## The Idea

A change is a set of requirements, and a set of packages that satisfy them.
Each state change of a package or of a change has a gate.
The `dotclaude-spec` command checks the gate, and an event in `events.jsonl` records the evidence.
A model cannot move a state by writing in a file, because the CLI is the only writer of the `status` key.

Each requirement has a stable ID, such as `REQ-12`.
A package lists the IDs that it satisfies.
The code carries no citation of the IDs.
The `plan` gate checks that each requirement is in the `satisfies` of a package.

[Spec Store Choices](Spec-Store-Choices) gives the source of each of these choices.

## Sizes

| Size | Use it when | What the change holds |
| --- | --- | --- |
| `trivial` | One edit has a command that shows that it is done. | `change.md`, with a `## Requirements` section |
| `medium` | A change touches one or more capabilities. | `change.md`, and one requirements file for each capability |
| `large` | Several agents do different parts. | The medium files, `design.md`, and `packages/` |

The default size is `medium`.
A small fix with a known cause is a `trivial` change.
There is no separate path for a hotfix.

## The Seven Phases

A change moves through seven phases.
Each phase has one slash command and one CLI subcommand with the same verb.

| Phase | Slash command | CLI |
| --- | --- | --- |
| Specify | `/dotclaude:specify` | `dotclaude-spec specify` |
| Plan | `/dotclaude:plan` | `dotclaude-spec plan` |
| Implement | `/dotclaude:implement` | `dotclaude-spec implement`, `verify` |
| Review | `/dotclaude:review` | `dotclaude-spec review` |
| Merge | `/dotclaude:merge` | `dotclaude-spec merge` |
| Accept | `/dotclaude:accept` | `dotclaude-spec accept` |
| Archive | `/dotclaude:archive` | `dotclaude-spec archive` |

[Spec Store Commands](Spec-Store-Commands) describes each subcommand.
[Spec Store States](Spec-Store-States) gives the gate of each phase.

## Work Across `/clear`

1. Run `/dotclaude:specify` with the id of the change and a size.
   The skill fills the requirements.
   It ends when the gate of `dotclaude-spec specify` passes.
2. For a `large` change, run `/dotclaude:plan <id>` to write the packages.
   A `trivial` or `medium` change gets the one package `P1` from `specify`, so it needs no `plan` step.
3. Run `/dotclaude:implement <id>`.
   It runs `dotclaude-spec ready` to pick the packages, and `dotclaude-spec runs` to limit the agents of a wave.
   It starts an `implementer` agent for each package, in its own worktree.
   It runs `dotclaude-spec verify` after each agent ends.
4. Run `/dotclaude:review <id>`.
   A `reviewer` agent reads the brief and the diff of each `verified` package, and it changes no file.
5. Run `/dotclaude:merge <id>` for each `approved` package.
   The main session merges the branch.
6. Run `/dotclaude:accept <id>`, and then `/dotclaude:archive <id>`.
7. Before `/clear`, run `dotclaude-spec status <id>`.
   The events hold the state, so a fresh session needs no handoff file.
   In the fresh session, run `dotclaude-spec next <id>` to continue.
   The `handoff` slice runs the same command when it resumes a session.
   See [Context and Handoff](Context-And-Handoff).

## Hooks

- The `agent.spawn` handler of an `implementer` that has a brief runs `dotclaude-spec implement <package>`.
- `turn.complete` does not move a package.
  `/dotclaude:implement` runs `verify` after the agent ends.
- The handoff trigger reads `merge` and `accept`.
- The status line counts the `done` packages of the active change, and leaves out the `canceled` packages.
  See [Status Line](Status-Line).

## Zero Token Cost

These parts run with no model call:

- The `dotclaude-spec` command, which reads and writes files, and runs `git` and the `verify` command of a package.
- The mod handlers of the `spec` slice.
  Their `evals` entries declare `requests: 0` and `tokens: 0`.
- The status line segment of the active change, which reads `activeProgress` from `src/kernel/spec-store.ts`.

These parts cost tokens:

- The seven skills, which the model runs.
- The `implementer`, `reviewer`, and `planner` agents.
- The handoff that can follow a merge or an accept.
  The `handoff` slice can submit a prompt to Claude, and each prompt starts a model turn.

## Bounds

| Name | Value | File |
| --- | --- | --- |
| `SIZES` | `trivial`, `medium`, `large` | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `DEFAULT_SIZE` | `medium` | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `USAGE_SAMPLE_MAX_MS` | 600000 (10 minutes) | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `SUBAGENTS_DEFAULT` | 20 | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `CHANGE_ID` | letters, digits, `.`, `_`, `-`, not `archive` | `src/plugins/dotclaude/slices/spec/limits.ts` |
| `SPEC_SCHEMA` | 2 | `src/kernel/spec-store.ts` |
| `SHOW_EVENTS_MAX` | 5 | `src/plugins/dotclaude/slices/spec/limits.ts` |

## Related Pages

- [Spec Store Files](Spec-Store-Files): the files, the front matter, the IDs, and the events.
- [Spec Store States](Spec-Store-States): the states and the gates.
- [Spec Store Commands](Spec-Store-Commands): the subcommands.
- [Spec Store Choices](Spec-Store-Choices): the source of each choice, and the alternatives that dotclaude did not take.
- [Architecture](Architecture): the slices and the layout of the core plugin.
- [Skills](Skills): the skills that start and fill a change.
