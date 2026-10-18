# Decisions: Architecture

This page holds the decisions D37 to D39 and D42 to D47, which are the decisions about the architecture.
Read it to learn why the code has the slices, the generator, and the style that it has.
The index is [Decisions](Decisions).
The ids come from dotclaude 1.0.0, and a missing id is a removed decision.
The decisions D36, D40, and D41 are removed.
They described the rebuild as dotclaude 1.0.0, the spec store, and its append-only event log.
The `minispec` CLI replaced the store and keeps no log.
The reason is in `openspec/changes/claudetto-0-1-0/design.md` (D4 there).
The decisions of the user are dated 2026-10-12.

Each decision gives the problem, the choice, the alternatives, and the evidence.
Where the sources record no alternative, the page says so.
Inference is marked as inference.

## D37 Ports and Adapters Inside Vertical Slices

One capability spread over four folders in 0.28.0.
Parallel agents then conflicted on the shared folders.
A microkernel alone does not keep I/O out of the logic of an extension.

The choice is ports and adapters (hexagonal architecture) inside vertical slices.
A slice holds one capability, from its domain to its entry points.
The domain is pure data and functions.
A port is an interface that the domain needs, such as `FileReader`.
An adapter connects the domain to one entry point.
An entry point is a mod handler, a classic hook, a CLI, or a status-line segment.

**Alternatives:** Clean architecture in layers, and a microkernel alone.
Jev picked the ports and adapters with confidence 0.82 on 2026-10-12.

**Evidence:**

- Status: `src/plugins/claudetto/slices/` has 17 slices.
  The add-ons have 12 slices in total.
- `biome.json` has `noRestrictedImports` overrides for the slice and domain folders.
  A slice imports only `src/kernel/` and its own folder.
- The pattern is explained on [Architecture](Architecture).

## D38 A Generated Composition Root

The mod runtime needs a literal event name in each `on()` call.
A shared file that each slice edits makes parallel work conflict.

The choice is a generator.
`just generate` reads the manifest `slice.ts` of each slice.
It writes `hooks/register.ts`, `hooks/hooks.json`, `plugin.json`, the texts, and the copies of the kernel that a plugin imports.
The generator finds the slices by a glob.
So no list of slices exists to edit.
It fails when one slice has two handlers with the same event, filter, and phase.

**Alternatives:** A hand-edited register file, and a list of slices in a shared file.
The design rules out both, because no shared file gets a hand edit.
The generator style stays in 0.1.0, see `openspec/changes/claudetto-0-1-0/design.md` (D1 there).

**Evidence:**

- `plugins/claudetto/hooks/register.ts` starts with a line that says it is generated.
  It has 25 `on()` calls.
- The `justfile` runs `generate --check` in `check`.
  A plugin file that differs from the generator output fails the check.
- The generator is in `tools/generate/`.

## D39 One Hook Module in Place of Classic Command Hooks

A classic command hook starts a process for each event.
A mod handler runs in the process of the mod runtime, with no Bun start.

The choice is one module for each plugin.
The `hooks/hooks.json` of each plugin names one module, `./register.ts`.
A classic hook stays only when no mod event can do the work.
The core plugin keeps two, `WorktreeCreate` and `WorktreeRemove`, for the `worktree` slice.
`claudetto-codegraph` keeps two classic events, `SessionStart` and `PostToolUse`.
It keeps them for its index sync, which runs a subprocess.

**Alternatives:** One classic command hook for each event.
The design rules this out for a check before or after a tool call.
The order of rungs is the decision ladder in `openspec/changes/claudetto-0-1-0/design.md` (D2 there).

**Evidence:**

- `plugins/claudetto/hooks/hooks.json` has the module and the two worktree hooks.
- `plugins/claudetto-sessions/hooks/hooks.json` names one module.
- `plugins/claudetto-codegraph/hooks/hooks.json` has `SessionStart` and `PostToolUse` entries with the `command` type.
- The hook events are on [Architecture](Architecture) and [Hook Events](Hook-Events).

## D42 Zero Token Cost Where a Hook, a Script, or a CLI Can Do the Work

A skill step that only runs a command costs model calls.
Each call reads the context again.
So the step costs cache reads and output tokens.

The choice is to move each such task to a hook, a script, a setting, or a status-line command.

**Alternatives:** Keep each step in the skill text, for Claude to run.

**Evidence:** One headless run for each form, in `just sandbox`, from the file above, in the section "Live runs".
The names in these runs are the names of dotclaude 1.0.0.

- Item 5, the `usage` command.
  The skill form had 2 turns and $0.038.
  The `command.run` handler form had 0 turns and $0.
  This is one sample.
- Item 8, the `test-runner` agent.
  The `dotclaude-run-checks` form did not save tokens.
  Its runs cost about the same as the agent, from $0.006 to $0.031 each, with 2 turns in the final runs.
  The measured result is that item 8 did not move to zero.
  The command is now `claudetto-run-checks`.
- `claudetto-usage` gives the measured counts.
  The repository has no measured total for the whole task list.

## D43 `asks` Only on a Weaker Check or Discarded Work

0.28.0 asked on each adherence check (D34 on [Decisions](Decisions)).
A read cannot weaken a check.
So an ask on a read adds no safety.

The choice is that the `asks` slice asks only when a change weakens a check.
The mod handler runs on `tool.check` for `Bash`, `Write`, `Edit`, and `MultiEdit`.
So a read never reaches it.
A change to a test, CI, lint, runner, hook, settings, or limits file gets an ask only when it removes or weakens a check.
A change that keeps or adds checks gets no ask.

**Alternatives:** Ask on each change to a protected file.
The user rules this out for a change that keeps or adds checks.

**Evidence:**

- `plugins/claudetto/hooks/register.ts` has `on("tool.check", { tool: ["Bash", "Write", "Edit", "MultiEdit"] }, h2)`.
- `src/plugins/claudetto/slices/asks/domain/weaker.ts` gives the weaker test for each kind of file.
- `src/plugins/claudetto/slices/asks/lab/asks.test.ts` has the lab tests.
  This page does not run them.
- The ask is on [Guards](Guards).

## D44 Jev Is a Slice of the Core Plugin, with a Small Model as the Fallback

The decisions that facts settle can go to Jev.
The decisions service is a slice of the core plugin, not an add-on.
The source of that answer is Jev, with confidence 0.78.
Inference: a core slice needs no add-on install before a workflow can ask a decision.

The basis changed in 0.1.0.
Jev is no longer the default.
The `decide` option is `off` by default, and the user turns on `jev`.
The decision is D5 in `openspec/changes/claudetto-0-1-0/design.md`.

The choice is the `decide` slice in `src/plugins/claudetto/slices/decide/`.
With the option `jev`, Jev runs through the `claudetto-decide` CLI and picks an option of each `AskUserQuestion` question that facts settle.
Release 0.2.0 removed the `second_opinion` tool and the fallback model, because the controls page lists them with no incident.
When Jev gives no pick, the question stays as Claude asked it.

**Alternatives:** Keep the add-on `dotclaude-jev`, which dotclaude 1.0.0 removed.
Or keep it with the `second_opinion` tool and the fallback model, which release 0.2.0 removed.

**Evidence:**

- `src/plugins/claudetto/slices/decide/adapters/ask.ts` sends the questions to Jev, and it leaves a question as Claude asked it when Jev gives no pick.
- `src/plugins/claudetto/slices/decide/limits.ts` has `JEV_TIMEOUT_MS` of 45 seconds.
  It has `TRIES` of 3, and `ATTEMPT_TIMEOUT_MS` of 12 seconds.
  The limits file says that a test pins that the tries fit in the timeout.
- The service is on [Decision API](Decision-API).

## D45 Add-Ons Import Nothing from the Core Plugin or from Each Other

Each add-on works with no other plugin installed.
`claudetto-lab` matters most, because a user debugs a session with it.

The choice is that each add-on has its own `src/plugins/<add-on>/`.
The generator copies each `src/kernel/` module that an add-on imports into the add-on's `kernel/` folder.
The copies cannot drift, because the generator writes them from one source.
The decision is D8 in `openspec/changes/claudetto-0-1-0/design.md`.

**Alternatives:** A shared package for the add-ons, or an add-on that depends on the core plugin.
The 0.1.0 design rules out a shared npm package, because it adds an install step and a version skew between plugins.

**Evidence:**

- `tests/support/addons.test.ts` fails when an add-on file names `../claudetto/` or `plugins/claudetto/`.
- Rule 4, `checkPluginBoundary` in `tests/support/import-rules.ts`, flags each import that leaves its plugin.
  `tests/claudetto/imports.test.ts` runs the rules over `plugins/`.
  So an import between two add-ons fails.
- The add-ons are on [Add-Ons](Add-Ons).

## D46 Bounds in Three Tiers

Copies of one bound in code, config, and prose drift apart.
D18 on [Decisions: Layout](Decisions-Layout) set the three tiers.

The choice keeps the three tiers.
A shared runtime bound is in `src/kernel/budget.ts`.
A slice bound is in `slices/<s>/limits.ts`.
The tree has 20 of these files.
A repository bound is in `tools/limits.ts`.
A test pins each copy.
So a change to a bound in its one file changes its copies.

**Alternatives:** The records of dotclaude 1.0.0 name none beyond D18.

**Evidence:**

- `src/kernel/budget.ts` has `CONTEXT_WINDOW` of 300,000 tokens, and the other shared bounds.
- `tools/limits.ts` has `FILE_MAX_LINES` of 300 and `TEST_FILE_MAX_LINES` of 500.
- `tests/support/file-size.test.ts` enforces the file sizes.
- The tiers are on [Plugin Layout](Plugin-Layout#bound-tiers).

## D47 Arrow Functions, Plain Data, and Classes Only for State

The user decided on 2026-10-12 that code uses arrow functions.
The user also decided that OOP is used only where it fits.
Plain data and pure functions are the default.

The choice is `export const f = (a: A): B => ...`.
An interface holds each port and each contract.
A class holds only state that lives across calls.
Domain code is plain data and functions.
So a test calls it with no stub.

**Alternatives:** The records of dotclaude 1.0.0 name none.

**Evidence:**

- `biome.json` sets `useArrowFunction` to `error` for each file.
- `tools/lint/arrow-functions.grit` flags a `function` declaration, because Biome has no rule for one.
- `tools/lint/prose-in-code.grit` flags a long text in the code of a plugin or of the kernel, because each message goes in `prompts/` ([Plugin Layout](Plugin-Layout#the-prompt-files-of-a-slice)).
- The code style is on [Architecture](Architecture).

## Related Pages

- [Architecture](Architecture)
- [Design](Design)
