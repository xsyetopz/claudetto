# Decisions: layout

This page holds D17, D18, D20, D23, and D24.
The index is [Decisions](Decisions).
D19 and D21 are reversed in 1.0.0.
Their entries are in [Decisions-Reversed](Decisions-Reversed#layout).

## D17 Plugin and marketplace layout

Problem: Claude Code copies each plugin into its cache folder, and a plugin cannot use a file outside its own folder after the copy.
The copy rules are in [Plugin loader](Plugin-Loader).

Choice:

- A module file imports other files by a relative path inside its plugin.
  For example, `plugins/dotclaude/hooks/register.ts` imports `../slices/<s>/adapters/mod.ts`.
- A handler with `$` calls can sit in a feature file that the hooks module imports.
  This is inference from probe P1 of the 0.28.0 work.
  The probe output is in `research/probes-3.md`, which the repository does not hold, so this run did not check it.
- Each `on()` call in `plugins/dotclaude/hooks/register.ts` takes a string literal as the event name.
  The hooks module has no `import()` call.

Alternatives: an import from outside the plugin folder.
The cache copy does not hold such a file, so the choice rules it out.

Evidence:

- `plugins/dotclaude/hooks/register.ts`, for the relative imports and the literal event names.
- `tests/dotclaude/imports.test.ts` and `tests/support/import-rules.ts`, which check the import rules over `plugins/`.
- `.claude/rules/hooks-module.md`, which forbids a `node:` or `bun:` import in the hooks module.
- The tree and the module graph are in [Plugin layout](Plugin-Layout).

## D18 Separation of concerns, size bounds, and bound tiers

Problem: a file with two concerns is hard to review.
A bound that exists only in prose drifts from the code.

Choice:

- Each file has one concern.
  A file has 300 lines or fewer, and a test file has 500 lines or fewer.
  `FILE_MAX_LINES` and `TEST_FILE_MAX_LINES` in `tools/limits.ts` hold these values.
  `tools/validate.ts` checks the bound, and `tests/support/file-size.test.ts` fails a file that is one line over it.
- Each bound is in one of three tiers:
  - A shared runtime bound is in `src/kernel/budget.ts`.
  - A slice bound is in `src/plugins/<plugin>/slices/<s>/limits.ts`.
    For example, `src/plugins/dotclaude/slices/setup/limits.ts` holds the subagent bounds of the setup slice.
  - A repository bound is in `tools/limits.ts`.
  Tests pin the copies of a bound in code and in config, and not in prose.
- The `AGENTS` list is not in the code.
  No slice defines it, because the frontmatter of each agent file is the official source.
- When `plugins/dotclaude/hooks/register.ts` passes 250 lines, the next feature becomes an add-on plugin.
  The file has 76 lines at the time of this page.
- The import rules are in `.claude/rules/slice-imports.md` and `.claude/rules/plugin-imports.md`.
  A slice imports only `src/kernel/` and its own folder.
  An add-on plugin imports nothing from another plugin.

Alternatives: none recorded in the repository.
The three tiers follow the owner of each bound: the kernel, a slice, or the repository.

Evidence:

- `tools/limits.ts`, `src/kernel/budget.ts`, and the `limits.ts` files of the slices.
- `tests/support/file-size.test.ts`, for the size bound.
- `tests/dotclaude/imports.test.ts`, for the import rules.
- The userConfig rule is from probe P2 of the 0.28.0 work.
  The probe showed that the install of a plugin shows a dialog even when each option has a default.
  The probe output is not in the repository, so this run did not check it.
  The same rule is in [Plugin layout](Plugin-Layout).
  The core plugin declares `userConfig` in `plugins/dotclaude/.claude-plugin/plugin.json`.

## D20 Remove `dotclaude-modder`

Problem: the modder plugin covered one niche, and the marketplace holds general-purpose software-engineering roles.

Choice: the plugin is not in `plugins/` or in `.claude-plugin/marketplace.json`.
Its files stay in git history.
The tree at commit `5cf4cb4` holds `plugins/dotclaude-modder/`.

Alternatives: keep the plugin in `plugins/` as an add-on.
The choice rejects this, because dotclaude is not a role for one niche.

Evidence:

- `.claude-plugin/marketplace.json` lists six plugins, and it does not list the modder plugin.
- `plugins/` holds no `dotclaude-modder` folder.
- The wiki names the removal in [Plugin layout](Plugin-Layout).
  The README, `CLAUDE.md`, and `CHANGELOG.md` do not name the removal.

## D23 Development frictions

Problem: an agent sandbox that blocks a local listen stops the nested Bash sandbox and `just capture`.

Choice:

- The user sets `sandbox.network.allowLocalBinding` to `true` in the settings of the session that runs the agent.
  The key is in the settings schema of Claude Code `2.1.296`, which `TESTED_VERSION` pins.
  The schema says that the key applies to macOS only.
- A scratch settings file with `sandbox.enabled: false` does not fix the problem.
  The choice rejects it, because it weakens the sandbox.
- The capture session of D16 is in [Sandbox](Sandbox#capture-session).
  D16 is in [Decisions-Prompt](Decisions-Prompt#d16-request-capture-and-the-session-start).
- The evals run through `claude plugin eval`.
  The `eval-compare` slice of `dotclaude-lab` runs it, and D9 is in [Decisions-Tools](Decisions-Tools#d9-evals-through-claude-plugin-eval).

Alternatives: a scratch setting that turns the sandbox off, which the choice rejects.

Evidence:

- `schemas/claude-code-settings.json`, for the `allowLocalBinding` key.
- `src/plugins/dotclaude/slices/setup/domain/facts.ts`, for `TESTED_VERSION`.
- `justfile`, for the `capture` recipe.
- `src/plugins/dotclaude-lab/slices/eval-compare/adapters/eval-both.ts`, for the `claude plugin eval` call.

## D24 Add-on plugins stay separate

Problem: an optional feature that costs tokens, or that needs an outside tool, makes the core plugin heavier for every user.

Choice: each such feature is a separate plugin.
The plugin works without the core plugin, and it imports nothing from it or from another plugin.
The reasons are:

- The plugin is the unit of install and disable.
- A plugin skill keeps its listing line until the plugin is off.
  This is from probe output of the 0.28.0 work, which the repository does not hold, so this run did not check it.
- One plugin forces all `$` calls into one module file.

Alternatives: merge the add-ons into dotclaude.
The user reversed this plan of 0.x.

The add-ons of 1.0.0 are:

- `dotclaude-codegraph`, `dotclaude-docs`, and `dotclaude-sessions`.
- `dotclaude-browser`, which keeps the browser skill.
  It replaces the built-in `WebSearch` with its headless browser, in `plugins/dotclaude-browser/slices/search/slice.ts`.
  The page is [Browser](Browser).
- `dotclaude-lab`, a debugging add-on that works alone.

Jev moved out of the add-ons.
The `dotclaude-jev` add-on of 0.28.0 is in the archive ([Jev plugin of 0.28](Jev-Plugin-0.28)).
In 1.0.0, Jev is the `decide` slice of the core plugin, because the decisions service is a slice and not an add-on.
The page is [Second opinion](Second-Opinion).

The marketplace lists the plugins in this order: `dotclaude`, `dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab`.

Evidence:

- `.claude-plugin/marketplace.json`, for the list and its order.
- `.claude/rules/plugin-imports.md`, and `tests/support/import-rules.ts`, for the import rule.

## Related pages

- [Plugin layout](Plugin-Layout)
- [Development](Development)
