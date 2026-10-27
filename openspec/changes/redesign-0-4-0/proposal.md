## Why

The current layout computes one fact in more than one place, hides the data and the hook order between slices, and mixes dead and paid tooling with the product (`prd.md`, "Problem").
This change moves the core to capability modules with named hook rules, and splits the dev tooling from the product (`architecture.md`, A1-A8).

## What Changes

- **BREAKING** (maintainer): `plugins/claudetto/slices/` becomes `plugins/claudetto/modules/` with the modules `shell`, `project`, `jev`, `session`, `work`, `gate`, `agents`, `statusline`, `setup`, and `spec` (A1).
  A module imports another module at the file that defines the name, with no `index.ts` barrel (the user, 2026-10-26).
- **BREAKING** (maintainer): each `on` call of `hooks/register.ts` has a rule name, and `evals/hooks.json` is keyed by rule name (A2, D3 of `design.md`).
- Each `$.state` value gets one owner module, and a type test checks `types/index.d.ts` against the owner types (A3).
- Each duplicate detection of `research/core.md` ("Coupling" item 3) becomes one function in its owner module, and the commands and the mod hooks share it.
- The kernel keeps only the options, text helpers, ports, hook types, and `kernel/node/`. The options are read in one place.
- **BREAKING** (user): the `claudetto-docs` plugin is removed, and its skill becomes `claudetto:find-docs` in the core plugin, with its `ctx7` CLI path and its permission rules, and with no MCP server and no key option (A4).
  A user of `claudetto-docs` uninstalls it, and a user who wants the `context7` MCP server adds it to their own settings.
- **BREAKING** (maintainer): the paid and manual tools move from `tools/` to `dev/`, and `just check` and CI run one `tools/check.ts` (A5).
- The tools with no caller are deleted or get a recipe (A7). `tests/kernel/copies.test.ts`, the stale `.jscpd.json` ignore, the stale `.gitignore` line, and the duplicate tests go.
- `just test` stops writing the wiki, and `generate` writes and checks `openspec/schemas/` from the presets (A8).
- `src/wiki/claudetto/Architecture.md` and `.claude/rules/` describe the new layout, and a test checks that each named folder exists.
- All manifests go to `0.4.0-alpha.1`.

## Capabilities

### New Capabilities

- `plugin-architecture`: the modules, the rule names, the import rules, the state owners, one parser for each fact, and the architecture page.
- `repo-tooling`: the split of `dev/` from `tools/`, the one gate script, no tool or test with no use, and the generated schemas.

### Modified Capabilities

- `handover`: the path of its bounds file.
- `session-economy`: the path of the `/goal` bound.
- `setup`: the path of its bounds file, and `find-docs` as a skill of `claudetto`.
- `settings-levers`: the path of the shared bounds.
- `status-line`: the owner of the temp folder.
- `usage-awareness`: the owner of the usage line and the path of the bands.
- `minispec`: the owner of the task counter, and the size pin of the module.
- `lean-surface`: the folders of the line bound.

## Impact

- Code: each file of `plugins/claudetto/slices/` and `plugins/claudetto/kernel/` moves or merges, `plugins/claudetto-docs/` goes, and `plugins/claudetto/skills/find-docs/` comes.
- Tests: each import in `tests/` changes, the import-rule tests merge into one, and the hook lab tests in `plugins/claudetto/tests/` change their imports only.
- Tools: `tools/` splits into `tools/` and `dev/`, and `justfile`, `package.json`, `biome.json`, `.jscpd.json`, and `.github/workflows/` change.
- Docs: `src/wiki/`, `wiki/`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `.claude/rules/`.
- Users: the `claudetto-docs` users reinstall. The other behavior stays (`prd.md`, G7).
- The change `release-0-3-0-alpha-3` and its uncommitted code are discarded (the user, 2026-10-25).
