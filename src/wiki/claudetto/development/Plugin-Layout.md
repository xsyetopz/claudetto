# Plugin Layout

This page tells how the repository arranges its files, and which import rules the tests check.
Read it before you add a file, a slice, or a plugin.
It does not cover how the parts work at run time.
That is on [Architecture](Architecture).
The parts of a slice and the steps to add one are on [Plugin Layout Slices](Plugin-Layout-Slices).

## Top Level

| Path | What it holds | Tracked |
| --- | --- | --- |
| `src/` | The source of each plugin, the kernel, the shipped texts, the fragments, and the wiki sources. | ✅ |
| `plugins/` | The plugins that users install. The generator writes them. | ✅ generated |
| `tools/` | The scripts of the repository, and the generator in `tools/generate/`. | ✅ |
| `tests/` | One folder for each plugin, and `kernel/`, `support/`, and `tools/`. | ✅ |
| `wiki/` | The pages of the wiki. The generator writes them from `src/wiki/`. | ✅ generated |
| `.claude-plugin/` | The marketplace file `marketplace.json`. The generator writes it. | ✅ generated |
| `.claude/rules/` | The rules that Claude Code loads for matching paths. | ✅ |
| `schemas/` | The settings schemas, written by `just schema`. | ✅ generated |
| `docs/` | A link to the wiki only. | ✅ |
| `external/` | Local sources. | ❌ git ignores it |

Each file under `plugins/` names its source in a header, except a JSON file.
A file in `plugins/` that has no source fails `just generate --check`.

## Marketplace and Plugins

`src/marketplace.ts` lists the plugins in this order: `claudetto`, `claudetto-codegraph`, `claudetto-browser`, `claudetto-docs`, `claudetto-sessions`, and `claudetto-lab`.

| Plugin | Source | Tests | Page |
| --- | --- | --- | --- |
| `claudetto` | `src/plugins/claudetto/` | `tests/claudetto/<slice>/` | [Overview](Overview) |
| `claudetto-codegraph` | `src/plugins/claudetto-codegraph/` | `tests/claudetto-codegraph/` | [Code Graph](Code-Graph) |
| `claudetto-browser` | `src/plugins/claudetto-browser/` | `tests/claudetto-browser/` | [Browser](Browser) |
| `claudetto-docs` | `src/plugins/claudetto-docs/` | `tests/claudetto-docs/` | [Library Docs](Library-Docs) |
| `claudetto-sessions` | `src/plugins/claudetto-sessions/` | `tests/claudetto-sessions/` | [Sessions](Sessions) |
| `claudetto-lab` | `src/plugins/claudetto-lab/` | `tests/claudetto-lab/` | [Lab](Lab) |

## The Source Tree

```text
src/kernel/                              shared code and ports
src/kernel/node/                         adapters of the Node and Bun runtimes
src/fragments/                           parts that more than one text repeats
src/wiki/                                the sources of the wiki pages
src/marketplace.ts                       the list of the plugins of the marketplace
src/plugins/<plugin>/plugin.ts           the manifest data: name, keywords, homepage
src/plugins/<plugin>/description.md      the description, one sentence on each line
src/plugins/<plugin>/slices/<s>/         one feature of the plugin
src/plugins/<plugin>/hooks/hooks.json    texts of a classic hook, when the plugin has one
src/plugins/<plugin>/evals/              eval cases of the plugin
```

The core plugin has 15 slices, and each add-on has one to four.
The generator finds each `slice.ts`, so no list of slices exists to edit.

## Imports

The import rules are in `tests/support/import-rules.ts`.
`tests/claudetto/imports.test.ts` runs them over `plugins/`.
`tests/claudetto/import-rules.test.ts` breaks each rule with a fixture.

- A plugin imports nothing from another plugin, `tools/`, or `tests/`.
- A plugin imports only relative paths and `node:` or `bun:` modules.
  The one allowed package is a type import of `claude-code`.
- A slice imports only `src/kernel/` and its own folder.
  Biome enforces this with `noRestrictedImports`.
- Domain code in `domain/` imports no adapter and no `src/kernel/node/` file.
- Each plugin has its own copy of the kernel files that it imports.
  `tools/generate/closure.ts` writes these copies.

The rules for each folder are in `.claude/rules/`, such as `slice-imports.md` and `plugin-imports.md`.

## The Hooks Module

- `plugins/<plugin>/hooks/register.ts` is generated, and it is the only hooks module.
  It has one literal `on()` call for each mod handler.
- A file in the import graph of the hooks module has no `node:` import, no `bun:` import, no `import()`, and no use of `Bun`.
  The event name of each `on()` call is a string literal.
  The rule is in `.claude/rules/hooks-module.md`, and `tests/support/import-rules.ts` checks it.
- A CLI adapter runs on Bun.
  So it may use `node:`, `bun:`, and `Bun`.
  The rule is in `.claude/rules/cli-adapters.md`.

## Hook Evals

Each hook of each plugin has an entry in `evals/hooks.json`.
The generator writes that file from the `evals` field of the hook in `slice.ts`.
`tests/support/hook-evals.test.ts` checks it.

- The id of a mod hook is `<event> <slice>`.
  The generated `register.ts` has the comment `// eval: <id>` above its `on()` call.
- The id of a classic hook is its event and its command, without the `bun` launcher and the plugin root.
- An entry has `requests` and `tokens`, the model requests and tokens that the hook adds to each turn.
- An entry names the test of each case kind as `<file from the repository root> > <test name>`.
  The kinds are `allow` and `text`.
  A hook that can block also has `block` and `false`, the case of a false block.
- A hook with `requests` above 0 names its `claude plugin eval` case in `eval`.
- A test that an entry names must exist, and an id that is not a hook of the plugin is a fault.

## Runtimes

| Code | Runtime |
| --- | --- |
| Runtime code in `plugins/` | `.ts` files with erasable syntax, on Bun 1.4.3 or later. |
| Tests and `tools/` | Bun 1.4.3 or later, with `bun test`. |
| Python | Code that needs Python is Python. The one tracked script is `tools/vanilla.py`. |

A plugin ships no `.js`, `.mjs`, or `.tsx` file.
A `.d.ts` file is allowed only when a manifest names it.
`tests/support/runtimes.test.ts` fails on any other script type.

## Bound Tiers

Each bound has one owner.
Tests pin the copies of a bound in code and config.
The values are on [Bounds](Bounds).

| Tier | File |
| --- | --- |
| Shared runtime | `src/kernel/budget.ts` |
| Slice | `src/plugins/<plugin>/slices/<s>/limits.ts` |
| Repository | `tools/limits.ts` |

A slice with no bound has no `limits.ts`.
A `userConfig` field in `slice.ts` is for a choice that the user makes.
Each option adds one dialog at install, so an option needs a real user choice.

## Related Pages

- [Plugin Layout Slices](Plugin-Layout-Slices): the parts of a slice and how to add one.
- [Architecture](Architecture): the layers and the slices.
- [Bounds](Bounds): each bound and its value.
- [Development](Development): the commands.
