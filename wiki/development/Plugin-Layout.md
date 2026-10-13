# Plugin Layout

This page tells how the repository arranges its files in 1.0.0.
Read it before you add a file, a slice, or a plugin.
It covers the source in `src/`, the generated plugins in `plugins/`, and the folders for tools, tests, the wiki, and the spec.
It does not cover how the parts work at run time.
That is on [Architecture](Architecture).
The decisions behind the layout are on [Decisions-Layout](Decisions-Layout).

## Top Level

| Path | What it holds | Tracked |
| --- | --- | --- |
| `src/` | The source of each plugin, the kernel, the texts, and the wiki sources. | Yes |
| `plugins/` | The plugins that users install. The generator writes them. | Yes, generated |
| `tools/` | The scripts of the repository, and the generator in `tools/generate/`. | Yes |
| `tests/` | The tests, one folder for each plugin, and `kernel/`, `support/`, and `tools/`. | Yes |
| `wiki/` | The pages of the wiki. | Yes |
| `.claude-plugin/` | The marketplace, `marketplace.json`. Hand-written. | Yes |
| `.claude/rules/` | The rules that Claude Code loads for matching paths. | Yes |
| `.dotclaude/spec/` | The spec of each change, such as `changes/1.0.0/`. | Yes |
| `schemas/` | The settings schemas, written by `just schema`. | Yes, generated |
| `docs/` | A link to the wiki only. | Yes |
| `external/` | Local sources, such as the extracts of the Claude Code binary. | No, git ignores it |

Each file under `plugins/` names its source in a header, except a JSON file.
A file in `plugins/` that has no source fails `just generate --check`.
`tools/generate/stray.ts` makes this check, and a file that git ignores is not checked.

## Marketplace and Plugins

The repository root is the marketplace root.
`.claude-plugin/marketplace.json` lists six plugins in this order: `dotclaude`, `dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab`.

| Plugin | Source | Tests | Page |
| --- | --- | --- | --- |
| `dotclaude` | `src/plugins/dotclaude/` | `tests/dotclaude/` | [Architecture](Architecture) |
| `dotclaude-codegraph` | `src/plugins/dotclaude-codegraph/` | `tests/codegraph/` | [Code-Graph](Code-Graph) |
| `dotclaude-browser` | `src/plugins/dotclaude-browser/` | `tests/browser/` | [Browser](Browser) |
| `dotclaude-docs` | `src/plugins/dotclaude-docs/` | `tests/docs/` | [Library-Docs](Library-Docs) |
| `dotclaude-sessions` | `src/plugins/dotclaude-sessions/` | `tests/sessions/` | [Sessions](Sessions) |
| `dotclaude-lab` | `src/plugins/dotclaude-lab/` | `tests/lab/` | [Lab](Lab) |

The test folder has no `dotclaude-` prefix.
Each add-on plugin imports nothing from `dotclaude`.
It imports nothing from another add-on either.

## The Source Tree

```text
src/kernel/                          shared domain code and ports, with no I/O
src/kernel/node/                     adapters of the Node and Bun runtimes
src/fragments/                       parts that more than one text repeats, no output of their own
src/wiki/                            the sources of the generated wiki pages
src/plugins/<plugin>/plugin.ts       the manifest data: name, description, keywords
src/plugins/<plugin>/slices/<s>/     one capability of the plugin (see below)
src/plugins/<plugin>/hooks/hooks.json  classic hooks of an add-on, with its texts
src/plugins/<plugin>/evals/          eval cases of the plugin, when it has some
```

The core plugin has 15 slices.
Each add-on has one to four slices.
The list of slices is in [Architecture](Architecture#slices-of-the-core-plugin).
You do not edit a list of slices, because the generator finds each `slice.ts`.

### The Parts of a Slice

The slice `handoff` shows the usual parts.

```text
src/plugins/dotclaude/slices/handoff/
  slice.ts              the manifest: the name, and each part that the slice adds
  limits.ts             the bounds of the slice
  domain/               pure code: data and functions, no I/O
  adapters/mod.ts       mod handlers, when the slice has any
  adapters/cli.ts       a CLI, when the slice has one
  skills/handoff/SKILL.md  a skill, one folder for each skill
  lab/handoff.test.ts   a hook lab test
```

Other slices add these parts when they need them.

| Part | Use | Output in `plugins/<plugin>/` |
| --- | --- | --- |
| `slice.ts` | Always. It exports `slice`, and `slice.name` equals the folder name. | Lines in `plugin.json`, `hooks.json`, and `register.ts` |
| `domain/` | Pure logic, with no import of an adapter. | `slices/<s>/domain/` |
| `ports.ts` | The interfaces that the domain needs, in the slices that have them. | `slices/<s>/ports.ts` |
| `adapters/mod.ts` | The functions that a mod handler runs. | `hooks/register.ts`, and `slices/<s>/adapters/mod.ts` |
| `adapters/cli.ts` | A CLI. It exports `main`. | `bin/<bin>`, a launcher, and `slices/<s>/adapters/cli.ts` |
| `skills/<name>/SKILL.md` | A skill. | `skills/<name>/SKILL.md` |
| `agents/<name>.md` | An agent, in the slice `agents`. | `agents/<name>.md` |
| `styles/<name>.md` | An output style, in the slice `styles`. | `output-styles/<name>.md` |
| `texts.ts/` | A folder of `.md` or `.json` texts. The generator gives a module. | `slices/<s>/texts.ts` |
| `lab/*.test.ts` | Hook lab tests. | `tests/*.test.ts`, which `claude plugin test` runs |
| `evals/<case>/` | Eval cases. | `evals/<case>/` |
| `limits.ts` | The bounds of the slice. | `slices/<s>/limits.ts` |

The domain of a slice imports no adapter.
It imports no `src/kernel/node/` file either.
Biome enforces this rule with `noRestrictedImports` overrides for the folders under `slices/`.
The `skills` and `agents` fields of `slice.ts` declare what the slice ships.
The generator finds the texts by their folder.
So a file in the folder ships even if the field is missing.

## How to Add a Slice

1. Choose the plugin.
   A capability that costs tokens when unused, or that needs an outside tool, goes in an add-on plugin ([Add-Ons](Add-Ons)).
   A new plugin needs the next step too.
2. Create `src/plugins/<plugin>/slices/<s>/slice.ts`.
   Export `slice` with `name` set to the folder name.
   Add each part that the slice needs, such as `mod`, `cli`, or `userConfig`.
   The contract is in `src/kernel/slice.ts`.
3. Add the code.
   Put the logic in `domain/`, and the entry points in `adapters/`.
   Export each mod handler from `adapters/mod.ts`, and name it in `run`.
   The generator finds the export name by its value.
4. Add the texts.
   Put each skill in `skills/<name>/SKILL.md`, each agent in `agents/<name>.md`, and each output style in `styles/<name>.md`.
5. Add the bounds to `limits.ts` of the slice, and the shared bounds to `src/kernel/budget.ts`.
   Do not put a bound in two files.
6. Add the tests.
   Put the repository tests in `tests/<folder>/<s>/`, and the hook lab tests in `lab/`.
   Name each hook eval in `evals` of its mod handler, so the generator writes `evals/hooks.json`.
7. For a new plugin, add `src/plugins/<plugin>/plugin.ts` that exports `plugin`.
   Then add the plugin to `.claude-plugin/marketplace.json` by hand.
8. Run `just generate`, which writes the files under `plugins/`.
   Commit the source and the generated files together.
   `just check` then runs `just generate --check`, and it fails on a difference.
9. Update the slice table in [Architecture](Architecture#slices-of-the-core-plugin) by hand.

The generator fails with a message on each of these errors:

- A `slice.name` that differs from the folder.
- Two mod handlers with the same event, filter, and phase.
- A CLI without `adapters/cli.ts`.

The fixture of the generator tests is in `tests/tools/generate/fixture/`.

## Imports

The import rules are in `tests/support/import-rules.ts`.
`tests/dotclaude/imports.test.ts` runs them over `plugins/`.

- A plugin imports nothing from another plugin, `tools/`, or `tests/`.
- A plugin imports only relative paths and `node:` or `bun:` modules.
  The one allowed package is a type import of `claude-code`.
- A slice imports only `src/kernel/` and its own folder.
- Each add-on has its own copy of the kernel files that it imports.
  `tools/generate/closure.ts` writes these copies.

The rules for each folder are in `.claude/rules/`, such as `slice-imports.md` and `plugin-imports.md`.

## The Hooks Module

- `plugins/<plugin>/hooks/register.ts` is generated, and it is the only hooks module.
  It has one literal `on()` call for each mod handler.
- A file in the import graph of the hooks module has no `node:` import, no `bun:` import, and no use of `Bun`.
  The rule is in `.claude/rules/hooks-module.md`.
  `tests/support/node-imports.test.ts` checks it.
- A CLI adapter runs on Bun.
  So it may use `node:`, `bun:`, and `Bun`.
  The rule is in `.claude/rules/cli-adapters.md`.

## Runtimes

| Code | Runtime |
| --- | --- |
| Runtime code in `plugins/` | `.ts` files with erasable syntax, on Bun 1.4.3 or later. |
| Tests and `tools/` | Bun 1.4.3 or later, with `bun test`. The version is in `.bun-version`. |
| Python | None now. No `.py` file is tracked. |

A plugin ships no `.js`, `.mjs`, or `.tsx` file.
A `.d.ts` file is allowed only when a manifest names it.
`tests/support/runtimes.test.ts` fails on any other script type.

## Bound Tiers

Each bound has one owner.
Tests pin the copies of a bound in code and config, not in prose.
The values are on [Bounds](Bounds).

| Tier | File | Examples |
| --- | --- | --- |
| Shared runtime | `src/kernel/budget.ts` | `CONTEXT_WINDOW` (300,000), `BASH_OUTPUT_MAX_CHARS` (4,000), `POLICY_TIMEOUT_MS` (5,000) |
| Slice | `src/plugins/<plugin>/slices/<s>/limits.ts` | `JEV_TIMEOUT_MS` (45,000) in the slice `decide` |
| Repository | `tools/limits.ts` | `FILE_MAX_LINES` (300), `TEST_FILE_MAX_LINES` (500), `CLAUDE_MD_MAX_BYTES` (6 KB), `START_TOKENS` (9,960) |

- A slice with no bound has no `limits.ts`.
  Some slices have none, such as `prompt` in the core plugin, and `docs` in `dotclaude-docs`.
  Slice `limits.ts` files exist for slices such as `guard`, `handoff`, and `statusline`.
- The first request has a range in `tools/limits.ts`, from `FIRST_REQUEST_LOW_BYTES` to `FIRST_REQUEST_HIGH_BYTES`.
  `just measure` runs `tools/measure.ts`.
  That script passes `START_TOKENS` to its check, and it exits with that status.
- A `userConfig` field in `slice.ts` is for a choice that the user makes.
  The generator copies it to `.claude-plugin/plugin.json`.
  Each option adds one dialog at install.
  So an option needs a real user choice.

## File Size

- A normal file has 300 lines or fewer.
  A test file has 500 lines or fewer.
  A test file has a name that ends in `.test.ts`.
- `tools/validate.ts` checks both bounds in `just validate`.
  `tests/support/file-size.test.ts` pins the rule at its edges.
- The bound applies to Markdown too.
  So a long page is split into linked pages.
- Two kinds of file are out of the bound.
  A file under `schemas/` is out.
  A file with the header of `just generate` is out too.

## Related Pages

- [Architecture](Architecture)
- [Decisions-Layout](Decisions-Layout)
- [Add-Ons](Add-Ons)
- [Bounds](Bounds)
- [Development](Development)
- [Sandbox](Sandbox)
