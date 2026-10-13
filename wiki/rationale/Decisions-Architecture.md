# Decisions: Architecture

This page holds the decisions D36 to D47, which are the decisions of 1.0.0 about the architecture.
Read it to learn why the code has the slices, the generator, and the style that it has.
The index is [Decisions](Decisions).
The decisions of the user are dated 2026-10-12.
The status lines give the state of the code at the base commit `dbbf41eb`.

Each decision gives the problem, the choice, the alternatives, and the evidence.
Where the sources record no alternative, the page says so.
Inference is marked as inference.

## D36 Rebuild with No 0.28.0 or 0.29.0 Code

0.28.0 failed as a product.
The first plan of 0.29.0 had 113 tasks.
It had no release after 40 of them.
One capability had 11 files.
OpenSpec was coupled into setup, the status line, the snippet, the tests, and the wiki.

The choice is a rebuild as 1.0.0.
No 0.28.0 or 0.29.0 code stays.
There is no migration, no legacy shim, and no compatibility layer.
The explanation of the layers that the rebuild replaces is in [Decisions: Layout](Decisions-Layout).

**Alternatives:** The change does not record a rejected alternative for the rebuild.

**Evidence:**

- `.dotclaude/spec/changes/1.0.0/change.md`, the section "Why" and the user decisions of 2026-10-12.
- Status: the rebuild list `tools/rebuild-pending.txt` named the paths that no package had removed or ported yet.
  P16 ported the last of them, and deleted the list and its check.

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
Jev's reasons are in `.dotclaude/spec/changes/1.0.0/design.md`, in the section "Architecture pattern".

**Evidence:**

- Status: `src/plugins/dotclaude/slices/` has 15 slices.
  The add-ons have 10 slices in total.
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

**Evidence:**

- `plugins/dotclaude/hooks/register.ts` starts with a line that says it is generated.
  It has 19 `on()` calls.
- The `justfile` runs `generate --check` in `check`.
  A plugin file that differs from the generator output fails the check.
- The generator is in `tools/generate/`.

## D39 One Hook Module in Place of Classic Command Hooks

A classic command hook starts a process for each event.
A mod handler runs in the process of the mod runtime, with no Bun start (`design.md`, "Component types").

The choice is one module for each plugin.
The core plugin's `hooks/hooks.json` names one module, `./register.ts`.
It names no classic hook.
A classic hook stays only when no mod event can do the work.
`dotclaude-codegraph` keeps two classic events, `SessionStart` and `PostToolUse`.
It keeps them for its index sync, which runs a subprocess.

**Alternatives:** One classic command hook for each event.
The design rules this out for a check before or after a tool call.

**Evidence:**

- `plugins/dotclaude/hooks/hooks.json` and `plugins/dotclaude-sessions/hooks/hooks.json` name one module each.
- `plugins/dotclaude-codegraph/hooks/hooks.json` has `SessionStart` and `PostToolUse` entries with the `command` type.
- The hook events are on [Architecture](Architecture#the-hook-module) and [Hook Events](Hook-Events).

## D40 Spec Store in Place of OpenSpec

OpenSpec was coupled into setup, the status line, the snippet, the tests, and the wiki.
The user decided on 2026-10-12 that dotclaude replaces OpenSpec with its own spec workflow.
That workflow is in the core plugin.
The change does not record another option.

The choice is the spec store under `.dotclaude/spec/changes/`.
It comes with the `dotclaude-spec` CLI.
It also came with the skills `/spec`, `/hotfix`, `/ship`, and `/handoff`.
Schema 2 replaced `/spec`, `/hotfix`, and `/ship` with the phase skills `/dotclaude:specify`, `plan`, `implement`, `review`, `merge`, `accept`, and `archive`.
The store is in the `spec` slice.
The types that the other slices read are in `src/kernel/spec-store.ts`.

**Evidence:**

- Status: `openspec/` is absent at `dbbf41eb`.
  No file under `src`, `tests`, or `tools` names OpenSpec.
- `plugins/dotclaude/bin/dotclaude-spec` is the CLI launcher.
- The spec workflow of schema 2 is on [Spec Store](Spec-Store).

## D41 An Append-Only Event Log in Place of `state.json`

The lanes of schema 1 were a map that a JSON file holds.
Two branches that move lanes in that file conflict.
A checkbox has two states, and a lane has five.
So the checkboxes of `packages.md` cannot hold the lanes.
`.dotclaude/spec/changes/1.0.0/evidence/zero-token.md` gives this reason in the section "`packages.md` and `state.json`".

The choice is `events.jsonl`.
It has a header line with the `schema` number.
It has one line for each state change.
Schema 2 keeps this log, and it replaced the lanes with the package states.
The state of a package is the last line of that package.
`.gitattributes` sets `merge=union` for `.dotclaude/spec/changes/*/events.jsonl`.
So two appends from two branches merge with no conflict.

**Alternatives:** Keep `state.json`, which the 0.28.0 store used.
The change file records no other option.

**Evidence:**

- `src/kernel/spec-store.ts` names the file `events.jsonl` in `EVENTS_FILE`, and it has the reader.
- `.gitattributes` has the `merge=union` rule.
- P34 requires a test for two appends that merge with no conflict.
  This page does not run that test.
- The format of schema 2 is on [Spec Store](Spec-Store).

## D42 Zero Token Cost Where a Hook, a Script, or a CLI Can Do the Work

A skill step that only runs a command costs model calls.
Each call reads the context again.
So the step costs cache reads and output tokens.

The choice is to move each such task to a hook, a script, a setting, or a status-line command.
A state change is an example.
In schema 1, the `agent.spawn` and `turn.complete` mod handlers ran the `lane` command.
Schema 2 replaced `lane` with `implement`, `verify`, and `block`, and no `turn.complete` hook moves a package.
The `agent.spawn` handler in `src/plugins/dotclaude/slices/spec/adapters/mod.ts` still runs `implement <package>`.
It makes no model call.
The task list is P33 in `packages.md`, with 10 rows in `zero-token.md`.

**Alternatives:** Keep each step in the skill text, for Claude to run.

**Evidence:** One headless run for each form, in `just sandbox`, from `zero-token.md`, in the section "Live runs".

- Item 5, the `usage` command.
  The skill form had 2 turns and $0.038.
  The `command.run` handler form had 0 turns and $0.
  This is one sample.
- Item 8, the `test-runner` agent.
  The new `dotclaude-run-checks` form did not save tokens.
  Its runs cost about the same as the agent, from $0.006 to $0.031 each, with 2 turns in the final runs.
  The measured result is that item 8 did not move to zero.
- `dotclaude-usage` gives the measured counts that P33 asks for.
  The repository has no measured total for the whole of P33.

The page on [Spec Store](Spec-Store) gives the state part.

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

- `src/plugins/dotclaude/slices/asks/adapters/mod.ts` names the tools in its header.
- `plugins/dotclaude/hooks/register.ts` has `on("tool.check", { tool: ["Bash", "Write", "Edit", "MultiEdit"] }, h0)`.
- `src/plugins/dotclaude/slices/asks/domain/weaker.ts` gives the weaker test for each kind of file.
- `src/plugins/dotclaude/slices/asks/lab/asks.test.ts` has the lab tests.
  This page does not run them.
- The ask is on [Guards](Guards).

## D44 Jev Is a Slice of the Core Plugin, with a Small Model as the Fallback

The decisions that facts settle go to Jev by default.
The change file says that the decisions service is a slice of the core plugin, not an add-on.
The source of that answer is Jev, with confidence 0.78.
The change file gives no reason beyond that answer.
Inference: a core slice needs no add-on install before a workflow can ask a decision.

The choice is the `decide` slice in `src/plugins/dotclaude/slices/decide/`.
Jev runs through the `dotclaude-decide` CLI with `--json`.
When Jev gives no answer, the fallback calls `$.model.complete` with the model `haiku`.
A result names the cause, such as `no-key`, `invalid-key`, or `no-balance`.
The fallback reply says that a Claude model answered, and that Jev did not.

**Alternatives:** Keep the add-on `dotclaude-jev`, which the change removes.
Or keep it with no fallback.

**Evidence:**

- Status: `src/plugins/dotclaude-jev/` and `plugins/dotclaude-jev/` are absent.
- `src/plugins/dotclaude/slices/decide/ports.ts` has the `Cause` type.
  `domain/route.ts` does not try Jev when there is no Jev provider.
- `src/plugins/dotclaude/slices/decide/limits.ts` has `JEV_TIMEOUT_MS` of 45 seconds.
  It has `TRIES` of 3, and `ATTEMPT_TIMEOUT_MS` of 12 seconds.
  The limits file says that a test pins that the tries fit in the timeout.
- The service is on [Second Opinion](Second-Opinion).

## D45 Add-Ons Import Nothing from the Core Plugin or from Each Other

Each add-on works with no other plugin installed.
`dotclaude-lab` matters most, because a user debugs a session with it (`design.md`, "Plugins").

The choice is that each add-on has its own `src/plugins/<add-on>/`.
The generator copies each `src/kernel/` module that an add-on imports into the add-on's `kernel/` folder.
The copies cannot drift, because the generator writes them from one source.

**Alternatives:** A shared package for the add-ons, or an add-on that depends on the core plugin.
The 1.0.0 files record neither option.
Inference: a shared package would make one add-on depend on another install.

**Evidence:**

- `tests/support/addons.test.ts` fails when an add-on file names `../dotclaude/` or `plugins/dotclaude/`.
- Rule 4, `checkPluginBoundary` in `tests/support/import-rules.ts`, flags each import that leaves its plugin.
  `tests/dotclaude/imports.test.ts` runs the rules over `plugins/`.
  So an import between two add-ons fails.
- The add-ons are on [Add-Ons](Add-Ons).

## D46 Bounds in Three Tiers

Copies of one bound in code, config, and prose drift apart.
D18 on [Decisions: Layout](Decisions-Layout) set the three tiers in 0.28.0.

The choice keeps the three tiers.
A shared runtime bound is in `src/kernel/budget.ts`.
A slice bound is in `slices/<s>/limits.ts`.
The tree has 12 of these files.
A repository bound is in `tools/limits.ts`.
A test pins each copy.
So a change to a bound in its one file changes its copies.

**Alternatives:** The 1.0.0 files record none beyond D18.

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
A class holds only state that lives across calls, such as the open spec store of one CLI run.
Domain code is plain data and functions.
So a test calls it with no stub.

**Alternatives:** The 1.0.0 files record none.

**Evidence:**

- `biome.json` sets `useArrowFunction` to `error` for `src/`, `tools/`, and `tests/`.
- `tools/lint/arrow-functions.grit` flags a `function` declaration, because Biome has no rule for one.
- The code style is on [Architecture](Architecture).

## Related Pages

- [Architecture](Architecture)
- [Design](Design)
