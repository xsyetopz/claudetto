# Decisions: layout

This page holds D17, D18, D19, D20, D21, D23, and D24.
The index is [Decisions](Decisions).

## D17 Plugin and marketplace layout

0.28.0 follows the layout in the plugin docs and keeps none of the old structure.
The tree, the manifest rules, and the module graph rules are in [Plugin layout](Plugin-Layout).

- A module file imports by relative path inside the plugin, because the cache copy has no file outside it.
- A handler with `$` calls can sit in a feature file that the module imports.
  Probe P1 passed, so the glue of a feature sits in its folder.
- The `on()` event names are string literals, and the module uses no `import()`.

## D18 Separation of concerns, size bounds, and bound tiers

- One concern for each file, 300 lines or fewer, and 500 for a test file.
  One test walks the repository and fails on a file over its bound.
- Bounds have three tiers: `lib/budget.ts`, `features/<name>/limits.mjs`, and `tools/limits.ts` ([Plugin layout](Plugin-Layout#bound-tiers)).
- The `AGENTS` list is dropped, because the agent frontmatter is the official source.
- Probe P2 showed that install shows a dialog even when each option has a default.
  A plugin adds a `userConfig` option only for a real user choice.
- When `hooks/register.mjs` passes 250 lines, the next feature becomes an add-on.
- The dependency rule has five lines, and the import test enforces it.

## D19 Runtimes

- Python code is Python.
- Runtime JavaScript is `.mjs` on Node.js 22.18 or later with `node:` modules.
  The `.test.ts` hook-lab files are the one exception.
- A file in the graph of the hooks module has no `node:` import.
- Tests and `tools/` use Node.js 22.18 or later, and the repository has no Bun.
  The eval suite is in the format of `claude plugin eval`.
- The old rule that the `um` command runs on Bun left with the plugin.

## D20 Remove `dotclaude-modder`

The plugin left the marketplace and `plugins/`.
Its files are in git history at commit `5cf4cb4`.
dotclaude is a set of general-purpose software-engineering roles, and not a role for one niche.
The docs, the README, the wiki, `CLAUDE.md`, and the CHANGELOG state the removal.

## D21 Hand-off order

The 0.28.0 plan ended in a hand-off.
The preparation group was for the user: a small live patch of settings, so that the 0.28.0 work did not run on the old settings.
No agent runs `sudo` or edits the user files.
The live patch changed settings only.
It left `includeGitInstructions` unchanged until the 0.28.0 prompt carried the attribution line, and it left `DISABLE_TELEMETRY` out.

## D23 Development frictions

0.28.0 removes each friction that the probes met.

- An agent sandbox that blocks a local listen stops the nested Bash sandbox and `just capture`.
  The fix is `sandbox.network.allowLocalBinding: true` in the settings of the session that runs the agent, which the user sets.
  A scratch `sandbox.enabled: false` does not help, and it would weaken the sandbox.
- The capture session of D16 is in [Sandbox](Sandbox).
- The evals run through `claude plugin eval` (D9).
- The managed drop-in of the first plan was used for the probes only, and it is gone.

## D24 Add-on plugins stay separate

The user reversed the first plan that merged the add-ons into dotclaude.
An optional feature that costs tokens or needs an outside tool is a separate plugin that works without the core and imports nothing from it.
The reasons: the plugin is the unit of install and disable, a plugin skill keeps its listing line until the plugin is off, and one plugin forces all `$` calls into one module file.

- `dotclaude-jev` registers a custom tool and not a skill.
  A custom tool costs about 10 tokens in the deferred list, against about 60 for a skill line.
  With `TYPESAFE_API_KEY` set, Claude asks Jev, and the handler puts the options in a random order.
  `hooks/register.mjs` registers the tool only when the key is set, so without the key the tool does not exist.
  When Jev fails, the tool result says that no second opinion was available, and tells Claude to answer from its own check and to tell the user ([Second opinion](Second-Opinion)).
  No reviewer fallback exists.
- `dotclaude-browser` keeps the browser skill and replaces the built-in `WebSearch` with its headless browser ([Browser](Browser)).
- `dotclaude-docs` and `dotclaude-codegraph` are new.
- The marketplace lists the plugins in this order: `dotclaude`, `dotclaude-codegraph`, `dotclaude-jev`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab`.

## Related pages

- [Plugin layout](Plugin-Layout)
- [Development](Development)
