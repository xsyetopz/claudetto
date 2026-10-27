# Decisions: Architecture

These decisions explain why the code has slices, a hand-written hooks module, and a fixed style.
Each topic gives the choice, the reason, and the evidence.

## Why Each Capability Is a Slice

**Choice:** Ports and adapters inside vertical slices.
A slice holds one capability: pure data and functions in the domain, and adapters for each entry point.
An entry point is a mod handler, a CLI, or a status line segment.

**Reason:** Layers spread one capability over four folders, and parallel agents then conflicted on the shared folders.

**Evidence:**

- `plugins/claudetto/modules/` has 10 modules with code, and the add-on has 1 slice.
- `tests/repo/imports.test.ts` fails when two modules import each other, when a kernel file imports a module, or when a `domain/` file imports an adapter.

## Why the Wiring Files Are Hand-Written

**Choice:** `plugins/claudetto/hooks/register.ts` is written by hand, with one literal `on()` call for each handler.
Version 0.2.0 generated it, with `hooks.json`, `plugin.json`, and the kernel copies, from a `slice.ts` manifest in each slice.
Version 0.3.0 removed the generator of the plugins and the manifests.
`just generate` writes only `wiki/`.

**Reason:** The mod runtime needs a literal event name in each `on()` call.
The generator and the manifests were more code than the 18 calls they wrote, and `plugins/` as the source is what Claude Code reads.

**Evidence:** `register.ts` has 18 `on()` calls.
`tests/repo/hook-evals.test.ts` fails when a call has no `// eval:` comment or no entry in `evals/hooks.json`.

## Why One Hook Module Replaces Most Command Hooks

**Choice:** `claudetto` and `claudetto-browser` each name one module, `./register.ts`, in `hooks.json`.
The one classic command hook is `PreModelSwitch` in `claudetto`, because the mod API has no event for a model switch.

**Reason:** A command hook starts a process for each event.
A mod handler runs inside Claude Code with no extra start.

**Evidence:** The two `hooks.json` files.
The hooks module has no `node:` import, no `bun:` import, and no `Bun` (`.claude/rules/plugins.md`).

## Why Scripts Beat Skills for Plain Work

**Choice:** A hook, a script, a setting, or a status line command does work that needs no model.
A `command.run` handler answers `/goal`, and the `claudetto-setup` CLI merges settings.

**Reason:** A skill step that only runs a command costs model calls, and each call reads the context again.

**Evidence:** One headless run of each form.
A usage report as a skill took 2 turns and $0.038.
As a `command.run` handler, it took 0 turns and $0.
This is one sample.

## Why Add-Ons Import Nothing from Other Plugins

**Choice:** Each add-on has its own folder in `plugins/`.
It keeps its own copy of each kernel file that it uses, and a test fails on each import that leaves its plugin.

**Reason:** Each add-on must work alone.
A shared npm package would add an install step and version skew.

**Evidence:**

- `tests/repo/addons.test.ts` fails when an add-on file names `../claudetto/` or `plugins/claudetto/`.
- `checkPluginBoundary` in `tests/repo/imports.test.ts` flags each import that leaves its plugin.

## Why Bounds Have Three Tiers

**Choice:** A kernel bound is in `plugins/claudetto/kernel/node/limits.ts`.
A module bound is in `modules/<m>/limits.ts` (14 files).
A repository bound is in `tools/limits.ts`.

**Reason:** Copies of one bound in code, config, and prose drift apart.
A test pins each copy, so one change in the owner file changes the copies.

**Evidence:** `CONTEXT_WINDOW` in `plugins/claudetto/modules/session/limits.ts` is 300,000 tokens.
`tools/limits.ts` holds `MIN_CLAUDE_CODE_VERSION`, `DOCKER_CPUS`, and `EVAL_MAX_COST_USD`.
See [Bounds](Bounds).

## Why Code Uses Arrow Functions

**Choice:** `export const f = (a: A): B => ...`.
An interface holds each port.
A class holds only state that lives across calls.
Domain code is plain data and functions, so a test needs no stub.

**Reason:** The user decided this on 2026-10-12.

**Evidence:** `biome.jsonc` sets `useArrowFunction` to `error`.
`.biome/plugins/noFunctionDeclaration.grit` flags a `function` declaration.

## Related Pages

- [Architecture](Architecture)
- [Design](Design)
- [Decisions](Decisions)
