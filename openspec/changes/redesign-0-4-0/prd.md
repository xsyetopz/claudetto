## Problem

The user asked to "completely redo the entire architecture", with breaking changes allowed (the user, 2026-10-25).
The user chose capability modules with event pipelines for the core, and a split of the dev tooling from the product for the repository (the user, 2026-10-25).
The maps of 2026-10-25 show why the current layout costs work (`research/core.md`, `research/tooling.md`).

- The same fact is computed in more than one place, so a fix in one place leaves the other copies wrong.
  User edits are found in `guard` and in `notes`, the `git status -z` parser is in `kernel/ledger.ts` and `finish/domain/record.ts`, a running agent is defined in 3 ways, and the Jev key is read in 3 slices (`research/core.md`, "Coupling" item 3).
- A slice cannot import a slice, so shared code goes to the kernel with no owner.
  Eight kernel files exist only for this, and the architecture page lists none of them (`research/core.md`, "Coupling" item 1).
- The data that slices pass to each other is hidden.
  The `$.state` keys `usage` and `note` link slices with no import, and `types/index.d.ts` copies the value shapes by hand (`research/core.md`, "Coupling" item 2).
- The order of the hooks for one event is hidden.
  Four slices hook `classic.Stop`, and only the list in `hooks/register.ts` holds their order (`research/core.md`, "Coupling" item 6).
- The repository holds code and checks that do nothing.
  About 2,100 lines of `tools/` have no caller, `tests/kernel/copies.test.ts` runs 0 cases, and 17 files in `openspec/schemas/` say that they come from a source that does not exist (`research/tooling.md`).
- The product and the dev tooling are mixed.
  Paid and manual tools (evals, sandbox, capture, schema) sit next to the gate tools in `tools/`, the `gate` and `ci` recipes repeat one list, and `just test` writes the wiki before each run (`research/tooling.md`, "Recipes").
- The docs are stale: `src/wiki/claudetto/Architecture.md` names a `styles` slice that does not exist and "four subagents" where the roster has six (`research/core.md`, "Dead or Weak Parts").

## Users

- A developer who runs Claude Code with claudetto on long tasks and leaves it to work.
  This user sees the hooks, the agents, the skills, the options, and the commands of the plugins.
- The maintainer of claudetto, who reads and changes the code, the tests, and the tools.

## Goals

- G1: Each fact that the plugin computes has one function, and each caller uses it.
- G2: Each piece of shared code has an owner that its name shows, and the architecture page lists each owner.
- G3: Each value that passes between parts of the plugin has one type, which its owner declares.
- G4: The order of the hooks of an event is in one file for that event, and a reader can see it.
- G5: The repository holds no tool, test, or generated file that nothing uses or checks.
- G6: The product that ships to users and the tooling of the maintainer are in separate folders, and one command runs the local gate.
- G7: Each behavior that a spec of `openspec/specs/` requires stays, unless this change names its removal as a breaking change.

## Non-goals

- New features for users.
- A change of the texts of the prompts, the agents, or the skills, except a move or a merge of a copy.
  The text work of the discarded change `release-0-3-0-alpha-3` gets a new change after this one (the user, 2026-10-25).
- A change of the permission decisions of the gate, of the Jev questions, or of the handover flow.

## Success Measures

- One function for each fact of item 1 of "Problem": a search finds one definition of each.
- Each hook lab scenario and each unit test of a kept behavior passes after the move, and `just check` passes.
- 0 tools with no caller, 0 tests that run 0 cases, and 0 generated headers that name a missing source.
- The lines of `plugins/claudetto/kernel/` go down, and the lines of `tools/` and `tests/` go down (the estimates are in `research/core.md` and `research/tooling.md`).
  The total runtime lines are not a measure, because the module boundary of D4 (`index.ts`, `state.ts`, and `limits.ts` of each module) adds lines with no behavior (the user, 2026-10-25).
- `src/wiki/claudetto/Architecture.md` names each module and each state value, and a test checks that each named folder exists.
