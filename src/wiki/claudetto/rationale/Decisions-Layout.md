# Decisions: Layout

These decisions explain where plugin files live and why the add-ons are separate plugins.

## Why Plugins Import Files by Relative Path

**Choice:** A module imports other files only by a relative path inside its own plugin.
A handler that uses `$` sits in the `adapters/mod.ts` file of its slice.
Each `on()` call in `register.ts` takes a string literal as the event name, and the hooks module has no `import()` call.

**Reason:** Claude Code copies each plugin into its cache folder.
After the copy, a plugin cannot use a file outside its folder.

**Evidence:**

- `plugins/claudetto/hooks/register.ts` shows the relative imports and literal event names.
- `tests/claudetto/imports.test.ts` and `tests/support/import-rules.ts` check the import rules over `plugins/`.
- `.claude/rules/hooks-module.md` forbids a `node:` or `bun:` import in the hooks module.
- [Plugin Layout](Plugin-Layout) shows the tree.

## Why Each File Has One Concern

**Choice:** Each file has one concern.
Each bound lives in one of three tiers (see [Architecture](Decisions-Architecture)).
A slice imports only `src/kernel/` and its own folder.
An add-on imports nothing from another plugin.

**Reason:** A file with two concerns is hard to review, and a bound in prose drifts from the code.
A rule on file length is not part of the design, because it made code split and grow (the user, 2026-10-19).

**Evidence:** `tools/limits.ts`, `src/kernel/budget.ts`, and the `limits.ts` files of the slices.
The `userConfig` of `plugin.json` has the options `advisor`, `advisorModel`, `advisorEffort`, `decide`, and `compaction`, each with a default.

## Why the Snippet Allows Local Binding

**Choice:** The settings snippet sets `sandbox.network.allowLocalBinding` to `true`.
The schema says the key applies to macOS only.
A scratch settings file with `sandbox.enabled: false` is rejected, because it weakens the sandbox.

**Reason:** A sandbox that blocks a local listen stops the tests, the dev servers, and `just capture`.

**Evidence:** `schemas/claude-code-settings.json` for the key, and the `capture` recipe in `justfile`.
See [Sandbox Sessions](Sandbox-Sessions#capture-session).

## Why Add-Ons Are Separate Plugins

**Choice:** An optional feature that costs tokens or needs an outside tool is its own plugin.
The plugin is the unit of install and disable.
The add-ons are `claudetto-codegraph`, `claudetto-docs`, `claudetto-sessions`, `claudetto-browser`, and `claudetto-lab`.
`claudetto-browser` replaces the built-in `WebSearch` with a headless browser.
Jev is not an add-on.
It is the `decide` slice of the core plugin, off by default.

**Reason:** A separate plugin keeps the core plugin light for every user.
One plugin also forces all `$` calls into one module file.

**Evidence:** `.claude-plugin/marketplace.json` lists the plugins in order.
See [Add-Ons](Add-Ons).

## See Also

- [Plugin Layout](Plugin-Layout)
- [Development](Development)
- [Decisions](Decisions)
