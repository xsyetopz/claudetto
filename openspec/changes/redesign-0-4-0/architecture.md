## Components

The user chose capability modules with event pipelines for the core, and a split of the dev tooling from the product (the user, 2026-10-25).
The module names and the file names below are proposed.

### Core Plugin `plugins/claudetto/`

- `modules/<m>/`: one capability each, with `index.ts` as its only public surface, `domain/` for pure code, `adapters/` for engine and runtime code, `prompts.ts` for texts, `limits.ts` for bounds, and `state.ts` for its `$.state` values.
  - `shell`: the shell reader, which leaves the kernel. It has no state.
  - `project`: the facts of the work tree and the transcript: the root, the paths, the task and change parse, the passed checks, the apply detection, the edit ledger, the `git status` parse, and the temp folders.
  - `gate`: the permission gate, the usage ask at red, the apply edit rule, the `Monitor` dedupe, and the `gh` titles.
  - `work`: the `/goal` check, the loop block, the `box` hook, the plan-claim check of `ground`, and the notes.
  - `session`: the handover, the context blocks and tool texts of `prompt`, the usage state, the compaction option, and the sweep and notices of `hygiene`.
  - `jev`: the Jev client, the one key lookup, the `AskUserQuestion` answers, and the Jev command.
  - `agents`: the offer of the roster and the default agent.
  - `statusline`, `setup`, `spec`: the command modules of `claudetto-statusline`, `claudetto-setup`, and `minispec`.
- `hooks/register.ts`: registers each rule with a literal `on` call and a `// rule:` name, in the order in which the rules run (D3 of `design.md`).
- `kernel/`: only code with no owner in the domain: the plugin options (read once), text helpers, the ports that tests replace, the hook types, and `kernel/node/` for the commands.
- `types/index.d.ts`: the `$.state` contract of the plugin.
- `agents/`, `skills/`, `output-styles/`, `bin/`, `settings.json`: as now. `skills/find-docs/` joins from `claudetto-docs`.

### Add-on `plugins/claudetto-browser/`

It stays a separate plugin with no import from another plugin.

### Repository

- `plugins/`: the product, and only `plugins/` ships to users.
- `tools/`: the tools of the local gate and the release: lint, the type check, validate, the hook lab, generate, the lock, the bounds, the release, and one `check` script.
- `dev/`: the paid and manual tools of the maintainer: evals and their statistics, the sandbox, the request capture, the schema extract, the built-in prompt diff, and the Docker check.
- `tests/`: the tests, in one folder for each plugin and each module (`tests/claudetto/<module>/`), and `tests/repo/` for the rules of the repository.
- `src/wiki/` and `wiki/`: the wiki source and the generated pages, as now.
- `openspec/`: the specs, the changes, and `openspec/schemas/`, which `generate` writes from the presets of the `spec` module.

## Data and Interfaces

- A module imports another module only through its `index.ts`, and the import graph of the modules has no cycle.
  The order is the kernel, then `shell`, `project`, and `jev`, then `session`, then `work`, then `gate`, and the command modules and `agents` last (proposed).
  This order fits each kernel import of each slice on 2026-10-25: `guard` reads `usage` and the shell reader, `hygiene` reads the shell reader and the ledger, and `finish` reads `usage` (`grep` of the `kernel/` imports of `slices/*/`).
- `register.ts` imports module `index.ts` files and the kernel only.
- A rule of `register.ts` has a name, an optional matcher of the engine (`on(event, match, handler)`), and a handler.
  The rule name is the key of `plugins/claudetto/evals/hooks.json`, in place of the `// eval:` comment lines that `tests/support/hook-evals.ts` reads now.
- Each `$.state` value has one owner module, whose `state.ts` declares its reference and its type.
  `types/index.d.ts` stays a contract with no import (its header), so a type test checks that each type of a `state.ts` and the contract type accept each other.
- A value that one module writes and another reads, such as `usage` and `note`, is a reference of the owner's `index.ts`, so the reader imports it.
- The commands in `bin/` and the mod hooks share each parse through the `domain/` of the owner module, so each fact has one parser for both runtimes.
- The plugin options are read once by `register.ts` and by each command, through one kernel function, in place of four `keepOptions`.

## Constraints

- A file in the import graph of `hooks/register.ts` has no `node:` import, no `bun:` import, and no `Bun` (rule `hooks-module.md`).
- A plugin imports nothing from another plugin, `tools/`, `dev/`, or `tests/` (rule `plugin-imports.md`).
- Each function is an arrow function (rule `arrow-functions.md`).
- Runtime code adds no feature that Claude Code has (rule `extension-points.md`).
- The work tree deletes 12 files of `.claude/rules/`, among them `layout.md` and `slice-imports.md` (`git status`, 2026-10-25), so this change writes the rules of the new layout.
- Biome enforces the import rules with `noRestrictedImports` (`biome.json:88,108,128`), so the patterns change with the layout.
- `just check` passes after each task group.

## Decisions

- A1: Capability modules in place of slices, and a module imports another module through its `index.ts`.
  Why: the rule "a slice imports no slice" moved shared code into 8 kernel files with no owner, and the same fact got 2 or 3 copies (`research/core.md`, "Coupling" items 1 and 3).
  Alternatives: keep the slices and move each duplicate into the kernel, which keeps the kernel with no owner. Event-only layout (option B of `research/core.md`), which leaves the command duplicates.
- A2: One file for each event, with an ordered list of named rules.
  Why: four slices hook `classic.Stop`, and only the list in `register.ts` holds their order (`research/core.md`, "Coupling" item 6).
  Alternative: keep the list in `register.ts` with a comment for each order.
- A3: The `$.state` contract stays a file with no import, and a type test checks it against each owner type.
  Why: the contract header says that a contract has no import, and the shapes are copies by hand now (`research/core.md`, "Coupling" item 2).
  Alternative: generate `types/index.d.ts` from the `state.ts` files, which adds a generator.
- A4: `claudetto-docs` becomes the skill `find-docs` of the core plugin, and `claudetto-browser` stays an add-on (the user, 2026-10-25, option "Split dev from product").
  The core skill uses only the `ctx7` CLI, and the core manifest gets no `mcpServers` and no `CONTEXT7_API_KEY` option, so a core user gets no new server (Jev for the user, 2026-10-25, confidence 0.97).
  Why: `claudetto-docs` has no code and no hooks, and three manifests and descriptions are held equal by tests (`research/tooling.md`, "Add-Ons").
  Alternative: keep both add-ons.
- A5: `dev/` holds the paid and manual tools, and `tools/` holds the gate and release tools, with one `check` script for `just check` and CI.
  Why: the `gate` and `ci` recipes repeat one list, and paid tools sit next to the gate tools (`research/tooling.md`, "Recipes").
  Alternative: one `tools/` folder with a naming rule.
- A6: The tests stay in `tests/`, in the layout of the modules, and do not move next to the code.
  Why: only `plugins/` ships to users (`src/wiki/claudetto/Architecture.md`), so a test next to the code ships to each user. The hook lab tests stay in `plugins/claudetto/tests/`, because `claude plugin test` reads them there.
  Alternative: tests next to the code, as option B of `research/tooling.md` said, with an ignore rule for the install.
- A7: Each tool with no caller goes or gets a recipe: `tools/compare-builtins.ts`, `tools/compare/`, `tools/yolo/`, and `tools/vanilla.py` go, and `tools/builtins*` and `tools/text-defaults.ts` move to `dev/` with a recipe, because a fixture and the evidence pages come from them (proposed).
  Why: about 2,100 lines have no recipe and no CI caller (`research/tooling.md`).
  Alternative: move each one to `dev/` with a recipe.
- A8: `generate` writes `openspec/schemas/` from the presets of the `spec` module, and `generate --check` checks them.
  Why: 17 files name a source that does not exist, and nothing checks them (`research/tooling.md`, "Generation and Copies").
  Alternative: delete `openspec/schemas/` and point MiniSpec at the presets.
