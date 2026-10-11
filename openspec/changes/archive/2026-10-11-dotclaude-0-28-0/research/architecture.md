# Architecture review of the 0.28.0 plan

This note re-checks the plan against the official plugin and mod docs and the pattern guidance.
It changes no plan file.
**confirmed** names a doc tag or a `file:line`.
**inferred** has no doc or run behind it.

## Sources

- [R] `https://code.claude.com/docs/en/plugins-reference`
- [MP] `https://code.claude.com/docs/en/plugin-marketplaces`
- [MR] `https://code.claude.com/docs/en/plugins/mods/reference`
- [MC] `https://code.claude.com/docs/en/plugins/mods/create`
- [Co] `https://code.claude.com/docs/en/plugins/components`
- [L] `https://code.claude.com/docs/en/plugins/loading`
- [D] `.../plugins/dependencies`, [S] `.../skills` (same base, `https://code.claude.com/docs/en`)
- [P] `research/probes.md`, section 2.8

## Architecture that exists today

Style: a small modular monolith with one composition root.
`hooks/mod.mjs` holds the `$` glue, `lib/guard.mjs` holds pure rules, and `lib/budget.mjs` holds constants.

- `hooks/mod.mjs:18-19` imports only `lib/`, and `lib/guard.mjs:4-6` imports only `budget.mjs`. **confirmed**
- `hooks/mod.mjs:10-12` says that `claude plugin validate` follows `$` only into a function of the same file.
  So all `$` calls sit in `mod.mjs`. **confirmed**
- `lib/budget.mjs:1-43` holds nine unrelated constants. **confirmed**
- `lib/setup.mjs:94-125` writes a launcher stub, because a status line command gets no `${CLAUDE_PLUGIN_ROOT}`. **confirmed**
- No tool checks the import rule. It is in `CLAUDE.md` only. **confirmed**

## Facts from the docs that shape the layout

1. A mod has one hooks module.
   `modules` is an array with one path. [MR "Files"] **confirmed**
1. The module may import files inside the plugin by relative path.
   The one bare import is `claude-code`.
   Dynamic `import()` is invalid, and `on()` event names must be string literals. [MC "Check what Claude Code reads"] **confirmed**
1. Passing `$` to a function imported from another file fails validation.
   `$` may go only to a top-level function of the same file. [MC] **confirmed**
1. Validation lists the events and `$` calls of the module.
   The `plugin.register` event gives that list (`e.uses`) to other mods. [MR "Other mods"] **confirmed**
   That a call invisible to validation is invisible to a policy is **inferred**.
1. The module runs with no Node. [plugin-authoring skill, this session] **confirmed**
   So each file it imports must be pure ESM with no `node:` import.
   `lib/guard.mjs` is pure today.
1. A marketplace plugin is copied to the cache, and files outside it are not copied. [L "In-place and copied plugins"] **confirmed**
1. `${CLAUDE_PLUGIN_ROOT}` changes with each version, and durable files go to `${CLAUDE_PLUGIN_DATA}`. [R "Environment variables"] **confirmed**
1. A plugin `settings.json` applies only `agent` and `subagentStatusLine`. [R], [Co] **confirmed**
1. A plugin agent ignores `permissionMode`, `hooks`, `mcpServers`, and `initialPrompt`. [Co "Agents"] **confirmed**
   `scripts/` is a convention, not a name that Claude Code reads. [Co "Hooks"] **confirmed**
1. A skill may hold `scripts/`, called with `${CLAUDE_SKILL_DIR}`.
   `skillOverrides` does not apply to a plugin skill. [S] **confirmed**
1. `dependencies` is the official way to compose plugins.
   A manifest with a `name` and a `dependencies` array is a valid bundle. [D] **confirmed**
1. `userConfig` values reach the module as `options` in `register(on, options)`.
   Classic command hooks get `CLAUDE_PLUGIN_OPTION_<KEY>`.
   A status line command gets neither. [MR "Files"], [R "User configuration"] **confirmed**
1. `bin/` is on the Bash `PATH`, but claude.ai and Cowork skip a plugin with `bin/`. [R "Standard layout"] **confirmed**

## Decision review

| ID | Verdict | Reason |
| --- | --- | --- |
| D1 least power | keep | It is the repository rule. See "Unused official levers" for points the plan misses. |
| D2 no guard route | keep | A user decision. [MR "Settings"] allows `prependPlugins` from user settings on a machine with no managed settings. **confirmed** |
| D4 measured budget | change | Keep the measure. Store the result as data outside `plugins/`. |
| D17 layout | change | It follows the docs, with five changes below. |
| D18 size bounds | change | Keep 300 and 500. Move the constants. Add a module-size trigger. |
| D19 runtimes | change | Keep Node 22.18 `.mjs` and Bun. Add a test that walks imports from `hooks/register.mjs` and fails on `node:` or a path outside the plugin (fact 6). Keep the ban on shipped `.ts`. |
| D20 drop modder | keep | A user decision. No doc rule is against it. |
| D22 context bound | keep | It is one feature folder. |
| D24 one plugin | change | It conflicts with facts 1, 3, and 12. It reverses a user decision, so the user must confirm. |
| D25 roster | keep | `agents/*.md` is official. Remove the code copy. |
| `lib/budget.mjs` | change | It is a constants module that every feature edits. Split it in three tiers. |
| move map | change | See "Plan edits". |

### D17 layout

Follows the docs (**confirmed** [R "Standard layout"], [MP]):
`.claude-plugin/plugin.json`, `agents/`, `skills/<name>/SKILL.md`, `hooks/hooks.json`, `output-styles/`, `bin/`, `settings.json`, `./` paths, and the repository root as the marketplace root.
The probe [P] ran validate, `plugin test`, a live load, the `../scripts/lib/` import, and a `types` file. **confirmed**

Changes:

1. `types/index.d.ts` is needed only for `$.state` or a new namespace. [MR "Files"] **confirmed**
   Add it with the first feature that uses `$.state`.
1. `tests/mod.test.ts` to `hooks/register.test.ts` has no doc reason.
   [MC] uses `tests/`, and `claude plugin test` runs every `*.test.ts` under the folder. **confirmed**
   Keep `tests/`, with one file for each feature.
1. `skills/setup/scripts/settings.mjs` to `scripts/setup/` has no doc reason, because the docs bundle a script in the skill. [S] **confirmed**
   Move only code that a second caller needs.
1. `scripts/` names two roles: an entry point, and a pure library that the module imports.
   The name is allowed, so this is naming only (**inferred**).

### D18 and the one-module limit

- 300 lines for a file and 500 for a test: keep.
- Facts 1 and 3 put every `$` call in one file.
  The 0.27.0 module has 91 lines for 2 hooks.
  The plan adds about 15 hooks and tools (attachment cuts, `tool.describe`, `agent.offer`, `agent.spawn`, `turn.step`, `prompt.submit`, Jev, drift check, context bound).
  That count is **inferred**, and it passes 300 lines.
  This is the main risk, and probe P1 decides the layout.

### D24 one plugin

- A plugin is the unit of install and disable, and a mod is one module for each plugin. [D], [MR] **confirmed**
- One plugin forces all hook glue into one file (facts 1 and 3).
- A plugin skill keeps its listing line, and only the whole plugin turns it off (design D5, task 2.12).
  An unused add-on is a token cost with no switch.
- `agent-browser`, `TYPESAFE_API_KEY`, and a code-graph binary matter only to users who want them.
  `CLAUDE.md` says each add-on works without the core, and the merge removes that rule.

Recommendation (**inferred**, and it changes a user decision):

- Keep one marketplace.
- Keep `dotclaude` for the always-on profile, prompt, guard, router, agents, and status line.
- Keep add-on plugins for features that cost tokens or need an outside tool: Jev, browser, code graph.
  Each add-on imports nothing from another plugin.
- If the user keeps D24, probe P1 must pass, and the plan must state the size trigger below.

### `lib/budget.mjs` and bounds

Problems:

- The plan adds `FILE_MAX_LINES`, `TEST_FILE_MAX_LINES`, `START_TOKENS`, `SUBAGENT_CONTEXT_MAX`, `TOOL_RESULT_MAX`, `AGENT_DESCRIPTION_MAX_CHARS`, prompt variant bounds, and the router table (tasks 3.3 to 11.2). **confirmed**
- Four of them are read only by tests and tools, and would ship to users for no use.
- `AGENTS` repeats `model`, `effort`, and `maxTurns` of the agent files.
  The frontmatter is the official source. [Co "Agents"] **confirmed**
- A router table is data of one feature.
  A module that each feature edits is a change magnet (pattern guidance).

Three tiers:

1. **Shared runtime bounds**: read by two or more parts, or written to the profile by setup.
   `CONTEXT_WINDOW`, `USAGE_LEVELS`, `STYLE_MAX_BYTES`.
   They stay in `plugins/dotclaude/lib/budget.mjs`.
1. **Feature bounds**: read by one feature.
   They live in `features/<name>/limits.mjs`.
   Examples: guard timeouts, `SUBAGENT_CONTEXT_MAX`, `TOOL_RESULT_MAX`, the router table.
1. **Repository bounds**: read only by tests and tools.
   They live in `tools/limits.mjs`.
   `just measure` writes `START_TOKENS` to `tools/baseline.json`, so a measure is data and not a hand edit.
   The baseline file is a proposal.

`userConfig`:

- Use it for a per-user choice the module reads as `options`, such as the router switch or the autofix tool list. **confirmed** [MR "Files"]
- Do not use it for pinned bounds, because it adds a second source.
- Setup and the status line cannot read `options`, so their bounds stay in `budget.mjs`.
- Whether install shows a dialog when every option has a default is **inferred** (probe P2).

## Unused official levers

Each needs a check before use.

- `session.measure`, `$.session.usage()` (`context.tokens`, `window`, `percent`), and `$.ui.status` can draw the context figure in the mod. [MR "Mods API"] **confirmed**
  This removes the launcher stub.
  The script stays as the fallback for the IDE and headless runs (**inferred**).
- `experimental.monitors` runs a background command, but it is experimental. [R] **confirmed**
  A code-graph indexer fits (**inferred**).

## Target layout

```text
.claude-plugin/marketplace.json     dotclaude and each add-on
plugins/dotclaude/
  .claude-plugin/plugin.json        name, version, userConfig for per-user switches, types if $.state is used
  settings.json                     agent and subagentStatusLine only
  agents/*.md                       roster, the source of model, effort, maxTurns
  skills/<name>/SKILL.md            setup, handoff, docs, each with its own scripts/ if it has a CLI
  output-styles/dotclaude.md
  bin/                              only a tool that the model calls by name
  hooks/hooks.json                  modules: one path, plus classic command hooks
  hooks/register.mjs                composition root: literal on() lines, top-level $ functions, no rules
  tests/<feature>.test.ts           hook lab, one file for each feature
  lib/                              pure shared code, no node: import, imports only lib/
    budget.mjs                      shared runtime bounds only
  features/<feature>/               one folder for each concern
    rules.mjs                       pure logic, importable by the module
    limits.mjs                      bounds of this feature only
    cli.mjs                         optional entry for a classic hook or bin, may use node:
    data.mjs                        optional tables
plugins/dotclaude-jev/ dotclaude-browser/ dotclaude-graph/   add-ons, same shape, smaller
tests/<plugin>/ tools/ evals/ schemas/ wiki/ openspec/ external/   not shipped
tools/limits.mjs  tools/baseline.json                        repository bounds
```

Feature folders for 0.28.0: `guard`, `prompt`, `router`, `context` (D22), `autofix`, `statusline`, `setup`.
`features/` is a name chosen here, and `scripts/<feature>/` works the same way (**inferred**).

## Dependency rule

1. Entry points are `hooks/register.mjs`, `features/*/cli.mjs`, skill scripts, and the status line.
   They import their own `features/<name>/` and `lib/`.
1. `features/<name>/` imports `lib/` and its own folder.
   It never imports another feature.
   Shared code moves to `lib/`.
1. `lib/` imports only `lib/`.
1. A file in the module graph has no `node:` import.
1. `tools/` and `tests/` may import `plugins/`, but never the reverse.
   An add-on plugin imports nothing from another plugin. [L] **confirmed**

Enforcement: one Bun test in `tests/dotclaude/` that parses `import` lines (`dependency-cruiser` would add a dev dependency, a user decision).

## Slotting a new feature

1. Make `features/<name>/` with `rules.mjs` and `limits.mjs`.
1. Add literal `on(...)` lines and top-level `$` functions to `register.mjs`.
1. Add classic command hooks to `hooks.json` for child-process work.
1. Add `tests/<name>.test.ts`, `tests/dotclaude/<name>.test.mjs`, a `CHANGELOG` line, and a wiki page.

Only `register.mjs` and `hooks.json` change outside the feature (the composition root), and `budget.mjs` only for a shared bound.

Size trigger (proposal): when `register.mjs` passes 250 lines, the next feature becomes an add-on plugin with its own module.

- **Code-graph CLI with hooks** (`research/code-graph.md`): add-on `dotclaude-graph`.
  It ships `bin/<graph>` and a classic command hook that refreshes the index in `${CLAUDE_PLUGIN_DATA}`, with logic in `features/graph/cli.mjs` and no module.
  Reason: it needs an outside binary and has a token cost when unused.
- **sembr formatter hook**: one row in the `autofix` tool table (D7), with the `PostToolUse` and `Stop` hooks that exist.
  No new hook.
- **Context-figure hook**: a `session.measure` hook that calls `$.ui.status`.
  Formatting is in `features/statusline/rules.mjs`.
  It reads `CONTEXT_WINDOW` and `USAGE_LEVELS` from `lib/budget.mjs`.
  The glue is about 15 lines.
  A surface check (terminal, desktop, IDE) comes first.

## Plan edits implied

No edit is made here.

| File | Section | Change |
| --- | --- | --- |
| `design.md` | D17 tree | Use `lib/` and `features/<feature>/` (or keep `scripts/` and state the pure-graph rule). Keep `tests/`. Make `types/` conditional. |
| `design.md` | D17 "Unverified" | Delete it, because [P] 2.8 closed it. State the module-graph rules: relative imports inside the plugin, no `$` passed out, no `node:`. |
| `design.md` | D17, D18 | Add the one-file module limit and the 250-line trigger. Name the three tiers of bounds. |
| `design.md` | D19 | Add the "no `node:`" rule and the import test. |
| `design.md` | D4 | Store the measure in `tools/baseline.json`. |
| `design.md` | D12, D22 | Table to `features/router/data.mjs`. `SUBAGENT_CONTEXT_MAX` to `features/context/limits.mjs`. |
| `design.md` | D20, D24, Risks | Reverse the merge or add its conditions. Add the risk that a `$` call in an imported file is invisible to validation. |
| `design-parts.md` | D24, D25, D6 | D24 as above. D25: `agents/*.md` is the source, remove `AGENTS`. D6: add the mod-drawn context figure as an option. |
| `research/move-map.md` | `lib/` rows | `budget.mjs` stays in `lib/`. `guard.mjs` to `features/guard/rules.mjs`. `auto-mode-guard.mjs` to `features/guard/cli.mjs`. |
| `research/move-map.md` | test, setup, jev, browser rows | `tests/mod.test.ts` and `skills/setup/scripts/settings.mjs` stay. Jev and browser stay plugins if D24 is reversed. Delete the `scripts/guard/` note. |
| `tasks.md` | 3.1 to 3.3, 3.11 to 3.14 | Re-derive from the new tree and the D24 outcome. `FILE_MAX_LINES` goes to `tools/limits.mjs`. |
| `tasks.md` | 8.2, 9.1, 10.1, 10.5, 10.11, 11.1, 11.2 | Put each constant in its tier. 11.1 reads the frontmatter and drops `AGENTS`. |
| `tasks.md` | new P1 | Scratch plugin: does `on("tool.call", importedHandler)` validate, what does `calls:` list, and does `e.uses` show the calls? Pass lets glue sit in feature files. Fail applies the size trigger. |
| `tasks.md` | new P2, T1 | P2: the `userConfig` dialog with defaults. T1: the import-boundary test. |
| `specs/plugin-layout/spec.md` | bounds, runtimes, one plugin | Bounds have one home by tier. Add the module-graph rule. Remove or limit "One plugin". |
| `specs/agent-definitions`, `prompt-surface`, `system-prompt` | budget requirements (`agent-definitions` lines 12, 43, 79) | `AGENTS` becomes the agent frontmatter. Name the home of each bound by tier. |
| `CLAUDE.md` | usage-bound rule | Reword to three tiers. This needs the user's approval. |
