# Decisions: architecture

This page holds D36 to D47, the decisions of 1.0.0 about the architecture.
The index is [Decisions](Decisions).
The decisions of the user are dated 2026-10-12.
The status lines give the state of the code at the base commit `dbbf41eb`.

Each decision gives the problem, the choice, the alternatives, and the evidence.
Where the sources record no alternative, the page says so.
Inference is marked as inference.

## D36 Rebuild with no 0.28.0 or 0.29.0 code

0.28.0 failed as a product.
The first plan of 0.29.0 had 113 tasks, and it had no release after 40 of them.
One capability had 11 files, and OpenSpec was coupled into setup, the status line, the snippet, the tests, and the wiki.

The choice is a rebuild as 1.0.0.
No 0.28.0 or 0.29.0 code stays.
There is no migration, no legacy shim, and no compatibility layer.
The explanation of the layers that the rebuild replaces is in [Decisions: layout](Decisions-Layout).

Alternatives: the change does not record a rejected alternative for the rebuild.

Evidence:

- `.dotclaude/spec/changes/1.0.0/change.md`, the section "Why" and the user decisions of 2026-10-12.
- Status: `tools/rebuild-pending.txt` lists 11 paths that no package has removed or ported yet.
  P16 checks that the list is empty.

## D37 Ports and adapters inside vertical slices

One capability spread over four folders in 0.28.0.
Parallel agents then conflicted on the shared folders.
A microkernel alone does not keep I/O out of the logic of an extension.

The choice is ports and adapters (hexagonal architecture) inside vertical slices.
A slice holds one capability from its domain to its entry points.
The domain is pure data and functions.
A port is an interface that the domain needs, such as `FileReader`.
An adapter connects the domain to one entry point, such as a mod handler, a classic hook, a CLI, or a status-line segment.

Alternatives: clean architecture in layers, and a microkernel alone.
Jev picked the ports and adapters with confidence 0.82 on 2026-10-12.
Jev's reasons are in `.dotclaude/spec/changes/1.0.0/design.md`, the section "Architecture pattern".

Evidence:

- Status: `src/plugins/dotclaude/slices/` has 15 slices, and the add-ons have 10 slices in total.
- `biome.json` has `noRestrictedImports` overrides for the slice and domain folders.
  A slice imports only `src/kernel/` and its own folder.
- The pattern is explained on [Architecture](Architecture).

## D38 A generated composition root

The mod runtime needs a literal event name in each `on()` call.
A shared file that each slice edits makes parallel work conflict.

The choice is a generator.
`just generate` reads the manifest `slice.ts` of each slice.
It writes `hooks/register.ts`, `hooks/hooks.json`, `plugin.json`, the texts, and the copies of the kernel that a plugin imports.
The generator finds the slices by a glob, so no list of slices exists to edit.
It fails when one slice has two handlers with the same event, filter, and phase.

Alternatives: a hand-edited register file, and a list of slices in a shared file.
The design rules out both, because no shared file gets a hand edit.

Evidence:

- `plugins/dotclaude/hooks/register.ts` starts with a line that says it is generated.
  It has 19 `on()` calls.
- The `justfile` runs `generate --check` in `check`.
  A plugin file that differs from the generator output fails the check.
- The generator is in `tools/generate/`.

## D39 One hook module in place of classic command hooks

A classic command hook starts a process for each event.
A mod handler runs in the process of the mod runtime, with no Bun start (`design.md`, "Component types").

The choice is one module for each plugin.
The core plugin's `hooks/hooks.json` names one module, `./register.ts`, and no classic hook.
A classic hook stays only when no mod event can do the work.
`dotclaude-codegraph` keeps two classic events, `SessionStart` and `PostToolUse`, for its index sync that runs a subprocess.

Alternatives: one classic command hook for each event, which the design rules out for a check before or after a tool call.

Evidence:

- `plugins/dotclaude/hooks/hooks.json` and `plugins/dotclaude-sessions/hooks/hooks.json` name one module each.
- `plugins/dotclaude-codegraph/hooks/hooks.json` has `SessionStart` and `PostToolUse` entries with the `command` type.
- The hook events are on [Architecture](Architecture#the-hook-module) and [Hook events](Hook-Events).

## D40 Spec store in place of OpenSpec

OpenSpec was coupled into setup, the status line, the snippet, the tests, and the wiki.
The user decided on 2026-10-12 that dotclaude replaces OpenSpec with its own spec workflow, in the core plugin.
The change does not record another option.

The choice is the spec store under `.dotclaude/spec/changes/`, with the `dotclaude-spec` CLI and the skills `/spec`, `/hotfix`, `/ship`, and `/handoff`.
The store is in the `spec` slice, and the types that the other slices read are in `src/kernel/spec-store.ts`.

Evidence:

- Status: `openspec/` is absent at `dbbf41eb`.
  No file under `src`, `tests`, or `tools` names OpenSpec.
- `plugins/dotclaude/bin/dotclaude-spec` is the CLI launcher.
- The spec workflow is on [Spec store](Spec-Store).

## D41 An append-only event log in place of `state.json`

The lanes of one change are a map that a JSON file holds.
Two branches that move lanes in that file conflict.
A checkbox has two states, and a lane has five, so the checkboxes of `packages.md` cannot hold the lanes.
`.dotclaude/spec/changes/1.0.0/evidence/zero-token.md` gives this reason in the section "`packages.md` and `state.json`".

The choice is `events.jsonl`.
It has a header line with the `schema` number, and one line for each lane change.
The lane of a package is the last line of that package.
`.gitattributes` sets `merge=union` for `.dotclaude/spec/changes/*/events.jsonl`, so that two appends from two branches merge with no conflict.

Alternatives: keep `state.json`, which the 0.28.0 store used.
The change file records no other option.

Evidence:

- `src/kernel/spec-store.ts` names the file `events.jsonl` in `EVENTS_FILE`, and it has the reader.
- `.gitattributes` has the `merge=union` rule.
- P34 requires a test for two appends that merge with no conflict.
  This page does not run that test.
- The format is on [Spec store](Spec-Store#lanes-and-eventsjsonl).

## D42 Zero token cost where a hook, a script, or a CLI can do the work

A skill step that only runs a command costs model calls.
Each call reads the context again, so the step costs cache reads and output tokens.

The choice is to move each such task to a hook, a script, a setting, or a status-line command.
The lane change is an example.
The `agent.spawn` and `turn.complete` mod handlers in `src/plugins/dotclaude/slices/spec/adapters/mod.ts` run `dotclaude-spec lane`, with no model call.
The task list is P33 in `packages.md`, with 10 rows in `zero-token.md`.

Alternatives: keep each step in the skill text, for Claude to run.

Evidence, with one headless run for each form in `just sandbox`, from `zero-token.md`, the section "Live runs":

- Item 5, the `usage` command: the skill form had 2 turns and $0.038.
  The `command.run` handler form had 0 turns and $0.
  This is one sample.
- Item 8, the `test-runner` agent: the new `dotclaude-run-checks` form did not save tokens.
  Its runs cost about the same as the agent, from $0.006 to $0.031 each, with 2 turns in the final runs.
  The measured result is that item 8 did not move to zero.
- `dotclaude-usage` gives the measured counts that P33 asks for.
  The repository has no measured total for the whole of P33.

The page on [Spec store](Spec-Store#zero-token-cost) gives the lane part.

## D43 `asks` only on a weaker check

0.28.0 asked on each adherence check (D34 on [Decisions](Decisions)).
A read cannot weaken a check, so an ask on it adds no safety.

The choice is that the `asks` slice asks only when a change weakens a check.
The mod handler runs on `tool.check` for `Bash`, `Write`, `Edit`, and `MultiEdit`, so a read never reaches it.
A change to a test, CI, lint, runner, hook, settings, or limits file gets an ask only when it removes or weakens a check.
A change that keeps or adds checks gets no ask.

Alternatives: ask on each change to a protected file.
The user rules this out for a change that keeps or adds checks.

Evidence:

- `src/plugins/dotclaude/slices/asks/adapters/mod.ts` names the tools in its header.
- `plugins/dotclaude/hooks/register.ts` has `on("tool.check", { tool: ["Bash", "Write", "Edit", "MultiEdit"] }, h0)`.
- `src/plugins/dotclaude/slices/asks/domain/weaker.ts` gives the weaker test for each kind of file.
- `src/plugins/dotclaude/slices/asks/lab/asks.test.ts` has the lab tests.
  This page does not run them.
- The ask is on [Guards](Guards).

## D44 Jev is a slice of the core plugin, with a small model as the fallback

The decisions that facts settle go to Jev by default.
The change file says that the decisions service is a slice of the core plugin, not an add-on (Jev, confidence 0.78).
The change file gives no reason beyond that answer.
Inference: a core slice needs no add-on install before a workflow can ask a decision.

The choice is the `decide` slice in `src/plugins/dotclaude/slices/decide/`.
Jev runs through the `dotclaude-decide` CLI with `--json`.
When Jev gives no answer, the fallback calls `$.model.complete` with the model `haiku`.
A result names the cause, such as `no-key`, `invalid-key`, or `no-balance`.
The fallback reply says that a Claude model answered, and that Jev did not.

Alternatives: keep the add-on `dotclaude-jev`, which the change removes, and no fallback.

Evidence:

- Status: `src/plugins/dotclaude-jev/` and `plugins/dotclaude-jev/` are absent.
- `src/plugins/dotclaude/slices/decide/ports.ts` has the `Cause` type.
  `domain/route.ts` does not try Jev when there is no Jev provider.
- `src/plugins/dotclaude/slices/decide/limits.ts` has `JEV_TIMEOUT_MS` of 45 seconds, `TRIES` of 3, and `ATTEMPT_TIMEOUT_MS` of 12 seconds.
  The limits file says that a test pins that the tries fit in the timeout.
- The service is on [Second opinion](Second-Opinion).

## D45 Add-ons import nothing from the core plugin or from each other

Each add-on works with no other plugin installed.
`dotclaude-lab` matters most, because a user debugs a session with it (`design.md`, "Plugins").

The choice is that each add-on has its own `src/plugins/<add-on>/`.
The generator copies each `src/kernel/` module that an add-on imports into the add-on's `kernel/` folder.
The copies cannot drift, because the generator writes them from one source.

Alternatives: a shared package for the add-ons, or an add-on that depends on the core plugin.
The 1.0.0 files record neither option.
Inference: a shared package would make one add-on depend on another install.

Evidence:

- `tests/support/addons.test.ts` fails when an add-on file names `../dotclaude/` or `plugins/dotclaude/`.
- Gap: that test checks only the core plugin.
  A `grep` over `src/plugins/dotclaude-*` found no import between two add-ons, but no test checks it.
- The add-ons are on [Add-ons](Add-Ons).

## D46 Bounds in three tiers

Copies of one bound in code, config, and prose drift apart.
D18 on [Decisions: layout](Decisions-Layout) set the three tiers in 0.28.0.

The choice keeps the three tiers.
A shared runtime bound is in `src/kernel/budget.ts`.
A slice bound is in `slices/<s>/limits.ts`, and the tree has 12 of these files.
A repository bound is in `tools/limits.ts`.
A test pins each copy, so a change to a bound in its one file changes its copies.

Alternatives: the 1.0.0 files record none beyond D18.

Evidence:

- `src/kernel/budget.ts` has `CONTEXT_WINDOW` of 300,000 tokens and the other shared bounds.
- `tools/limits.ts` has `FILE_MAX_LINES` of 300 and `TEST_FILE_MAX_LINES` of 500.
- `tests/support/file-size.test.ts` enforces the file sizes.
- The tiers are on [Plugin layout](Plugin-Layout#bound-tiers).

## D47 Arrow functions, plain data, and classes only for state

The user decided on 2026-10-12 that code uses arrow functions, and that OOP is used only where it fits.
Plain data and pure functions are the default.

The choice is `export const f = (a: A): B => ...`.
An interface holds each port and each contract.
A class holds only state that lives across calls, such as the open spec store of one CLI run.
Domain code is plain data and functions, so a test calls it with no stub.

Alternatives: the 1.0.0 files record none.

Evidence:

- `biome.json` sets `useArrowFunction` to `error` for `src/`, `tools/`, and `tests/`.
- `tools/lint/arrow-functions.grit` flags a `function` declaration, because Biome has no rule for one.
- The code style is on [Architecture](Architecture).
