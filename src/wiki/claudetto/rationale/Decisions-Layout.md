# Decisions: Layout

This page holds the decisions D17, D18, D23, and D24.
Read it to learn why the plugins, the bounds, and the add-ons have the layout that they have.
The index is [Decisions](Decisions).
A missing id is a removed decision, and the index lists them.

## D17 Plugin and Marketplace Layout

**Problem:** Claude Code copies each plugin into its cache folder.
After the copy, a plugin cannot use a file outside its own folder.

**Choice:**

- A module file imports other files by a relative path inside its plugin.
  For example, `plugins/claudetto/hooks/register.ts` imports `../slices/<s>/adapters/mod.ts`.
- A handler with `$` calls sits in the `adapters/mod.ts` file of its slice, and the hooks module imports that file.
- Each `on()` call in `register.ts` takes a string literal as the event name.
  The hooks module has no `import()` call.

**Alternatives:** An import from outside the plugin folder.
The cache copy does not hold such a file, so the choice rules it out.

**Evidence:**

- `plugins/claudetto/hooks/register.ts`, for the relative imports and the literal event names.
- `tests/claudetto/imports.test.ts` and `tests/support/import-rules.ts`, which check the import rules over `plugins/`.
  Rule 6 covers the graph of a hooks module.
- `.claude/rules/hooks-module.md`, which forbids a `node:` or `bun:` import in the hooks module.
- The tree and the module graph are in [Plugin Layout](Plugin-Layout).

## D18 Separation of Concerns and Bound Tiers

**Problem:** A file with two concerns is hard to review.
A bound that exists only in prose drifts from the code.

**Choice:**

- Each file has one concern.
  A repository check on file length is not part of the design, because it made code split and grow instead of stay small (the user, 2026-10-19).
- Each bound is in one of three tiers:
  - A shared runtime bound is in `src/kernel/budget.ts`.
  - A slice bound is in `src/plugins/<plugin>/slices/<s>/limits.ts`.
  - A repository bound is in `tools/limits.ts`.
- Tests pin the copies of a bound in code and in config, and not in prose.
- The import rules are in `.claude/rules/slice-imports.md` and `.claude/rules/plugin-imports.md`.
  A slice imports only `src/kernel/` and its own folder.
  An add-on plugin imports nothing from another plugin.

**Alternatives:** None recorded.
The three tiers follow the owner of each bound: the kernel, a slice, or the repository.

**Evidence:**

- `tools/limits.ts`, `src/kernel/budget.ts`, and the `limits.ts` files of the slices.
- `tests/claudetto/imports.test.ts`, for the import rules.
- The `userConfig` of `plugins/claudetto/.claude-plugin/plugin.json` has the options `advisor`, `advisorModel`, `advisorEffort`, `decide`, and `compaction`, each with a default.

## D23 Development Frictions

**Problem:** A sandbox that blocks a local listen stops the tests, the dev servers, and `just capture`.

**Choice:**

- The settings snippet sets `sandbox.network.allowLocalBinding` to `true` (`src/plugins/claudetto/slices/setup/slice.ts`).
  The schema says that the key applies to macOS only (`schemas/claude-code-settings.json`).
- A scratch settings file with `sandbox.enabled: false` does not fix the problem.
  The choice rejects it, because it weakens the sandbox.
- The capture session is in [Sandbox](Sandbox-Sessions#capture-session).
- The evals run through `claude plugin eval` (D9 in [Tools](Decisions-Tools)).

**Alternatives:** A scratch setting that turns the sandbox off, which the choice rejects.

**Evidence:**

- `schemas/claude-code-settings.json`, for the `allowLocalBinding` key.
- `justfile`, for the `capture` recipe.

## D24 Add-On Plugins Stay Separate

**Problem:** An optional feature that costs tokens, or that needs an outside tool, makes the core plugin heavier for every user.

**Choice:** Each such feature is a separate plugin.
The plugin works without the core plugin.
It imports nothing from the core plugin or from another plugin.
The reasons are these:

- The plugin is the unit of install and disable.
- One plugin forces all `$` calls into one module file.

The add-ons of `claudetto` 0.2.0 are these:

- `claudetto-codegraph`, `claudetto-docs`, and `claudetto-sessions`.
- `claudetto-browser`, which replaces the built-in `WebSearch` with its headless browser (`src/plugins/claudetto-browser/slices/search/slice.ts`).
- `claudetto-lab`, a debugging add-on that works alone.

Jev is not an add-on.
It is the `decide` slice of the core plugin, which is off by default.

The marketplace lists the plugins in this order: `claudetto`, `claudetto-codegraph`, `claudetto-browser`, `claudetto-docs`, `claudetto-sessions`, and `claudetto-lab`.

**Alternatives:** Merge the add-ons into the core plugin.
The user reversed this plan of 0.x.

**Evidence:**

- `.claude-plugin/marketplace.json`, for the list and its order.
- `.claude/rules/plugin-imports.md` and `tests/support/import-rules.ts`, for the import rule.
- [Add-Ons](Add-Ons) gives each add-on.

## Related Pages

- [Plugin Layout](Plugin-Layout)
- [Development](Development)
- [Decisions](Decisions)
