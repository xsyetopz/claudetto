# Plugin Layout

This page tells how the repository arranges its files.
Read it before you add a file, a slice, or a plugin.
It covers the source in `src/`, the generated plugins in `plugins/`, and the folders for tools, tests, and the wiki.
It does not cover how the parts work at run time.
That is on [Architecture](Architecture).

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
| `schemas/` | The settings schemas, written by `just schema`. | Yes, generated |
| `docs/` | A link to the wiki only. | Yes |
| `external/` | Local sources, such as the extracts of the Claude Code binary. | No, git ignores it |

Each file under `plugins/` names its source in a header, except a JSON file.
A file in `plugins/` that has no source fails `just generate --check`.
`tools/generate/stray.ts` makes this check, and a file that git ignores is not checked.

## Marketplace and Plugins

The repository root is the marketplace root.
`.claude-plugin/marketplace.json` lists seven plugins in this order: `claudetto`, `claudetto-codegraph`, `claudetto-browser`, `claudetto-docs`, `claudetto-sessions`, `claudetto-lab`, and `claudetto-you-should-know`.

| Plugin | Source | Tests | Page |
| --- | --- | --- | --- |
| `claudetto` | `src/plugins/claudetto/` | `tests/claudetto/` | [Architecture](Architecture) |
| `claudetto-codegraph` | `src/plugins/claudetto-codegraph/` | `tests/claudetto-codegraph/` | [Code Graph](Code-Graph) |
| `claudetto-browser` | `src/plugins/claudetto-browser/` | `tests/claudetto-browser/` | [Browser](Browser) |
| `claudetto-docs` | `src/plugins/claudetto-docs/` | `tests/claudetto-docs/` | [Library Docs](Library-Docs) |
| `claudetto-sessions` | `src/plugins/claudetto-sessions/` | `tests/claudetto-sessions/` | [Sessions](Sessions) |
| `claudetto-lab` | `src/plugins/claudetto-lab/` | `tests/claudetto-lab/` | [Lab](Lab) |
| `claudetto-you-should-know` | `src/plugins/claudetto-you-should-know/` | `tests/claudetto-you-should-know/` | [You Should Know](You-Should-Know) |

The core plugin keeps its tests in one folder for each slice, as `tests/claudetto/<slice>/`.
Each add-on plugin imports nothing from `claudetto`.
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

The core plugin has 17 slices.
Each add-on has one to four slices.
The list of slices is on [Architecture](Architecture).
You do not edit a list of slices, because the generator finds each `slice.ts`.

### The Parts of a Slice

The slice `handoff` shows the usual parts.

```text
src/plugins/claudetto/slices/handoff/
  slice.ts              the manifest: the name, and each part that the slice adds
  limits.ts             the bounds of the slice
  domain/               pure code: data and functions, no I/O
  adapters/mod.ts       mod handlers, when the slice has any
  evals/handoff/       eval cases of the slice
  lab/compaction.test.ts  a hook lab test
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
| `prompts/` | The texts that the slice gives to Claude or to the user, as `.md` or `.json` files. | `slices/<s>/prompts.ts` |
| `lab/*.test.ts` | Hook lab tests. | `tests/*.test.ts`, which `claude plugin test` runs |
| `evals/<case>/` | Eval cases. | `evals/<case>/` |
| `limits.ts` | The bounds of the slice. | `slices/<s>/limits.ts` |

The domain of a slice imports no adapter.
It imports no `src/kernel/node/` file either.
Biome enforces this rule with `noRestrictedImports` overrides for the folders under `slices/`.
The `skills` and `agents` fields of `slice.ts` declare what the slice ships.
The generator finds the texts by their folder.
So a file in the folder ships even if the field is missing.

### The Prompt Files of a Slice

Each text of a slice that goes to Claude or to the user is a file in `prompts/`, and not a string in the code.
Examples are a deny reason, a notice, a block reason, and the prompt of a side model.
`tools/generate/emit/prompts.ts` writes the module `prompts.ts` from the folder, and the code imports each text from `../prompts.ts`.

| Source | Export in `prompts.ts` |
| --- | --- |
| `prompts/deny-reason.md` | `DENY_REASON`, a string |
| A `.md` file with `{{command}}` | A function, such as `DENY_REASON({ command })`, that gives a string |
| `prompts/automode.json` | `AUTOMODE`, an object |

- A `{{name}}` in lowercase is a parameter, and the code gives its value as a string at run time.
- A `{{NAME}}` in uppercase is a value that the generator fills from `limits.ts` of the slice, or from the shared values of `tools/generate/emit/fill.ts`.
  A number gets the form `20,000`.
- A line `{{include name}}` gives the text of `src/fragments/name.md`.
- The code keeps the choice between texts, the short labels, and the log lines.

Each part of a transform in `slices/prompt/transforms/` is a file in `prompts/` of the `prompt` slice, and the code keeps only its anchor.

Other texts use the same kind of folder:

- A kernel folder with a `prompts/` folder, such as `src/kernel/policy/`, gets its own `prompts.ts` module in each plugin that copies the folder.
- A hook lab test in `lab/` imports the texts from `../prompts.ts`, and `just generate` changes the import to the module in the copy of the slice.
- The description of a plugin is `src/plugins/<plugin>/description.md`, with one sentence on each line, and `just generate` joins the lines into the manifest.

Biome flags a long text in the code of a plugin or of the kernel, so a message cannot go back into the code.
The bound is `CODE_TEXT_MAX_CHARS` in `tools/limits.ts`.

- `tools/lint/prose-in-code.grit` flags a string literal or a template literal in each `.ts` file of `src/plugins/`, `src/kernel/`, and `plugins/`.
  The generated `prompts.ts` and `snippets.ts` modules are out of scope, because their sources are the `prompts/` folders, the JSON fragments, and the `settings` of each `slice.ts`.
- A template literal counts the sum of its fixed parts, so `${}` values cannot cut a text into short parts.
  A template literal in a `${}` value is a text of its own.
- In `slice.ts`, the `ladder` field and the `evals` field are not flagged, because they are fields of the slice contract that never ship as text.
  The rule finds them by their place in the code, not by their words.
- The rule counts characters, not words, so it works for each written language.
- For data, such as a command or a captured text, add `// biome-ignore lint/plugin: <reason>` on the line before the text.

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
   Put each message to Claude or to the user in `prompts/<name>.md` (see [The Prompt Files of a Slice](#the-prompt-files-of-a-slice)).
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
9. Update the slice table on [Architecture](Architecture) by hand.

The generator fails with a message on each of these errors:

- A `slice.name` that differs from the folder.
- Two mod handlers with the same event, filter, and phase.
- A CLI without `adapters/cli.ts`.
- A file in `prompts/` that is not `.md` or `.json`, or a `{{NAME}}` with no value.

The fixture of the generator tests is in `tests/tools/generate/fixture/`.

## Imports

The import rules are in `tests/support/import-rules.ts`.
`tests/claudetto/imports.test.ts` runs them over `plugins/`.

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
| Python | Code that needs Python is Python. The one tracked script is `tools/vanilla.py`. |

A plugin ships no `.js`, `.mjs`, or `.tsx` file.
A `.d.ts` file is allowed only when a manifest names it.
`tests/support/runtimes.test.ts` fails on any other script type.

## Bound Tiers

Each bound has one owner.
Tests pin the copies of a bound in code and config, not in prose.
The values are on [Bounds](Bounds).

| Tier | File | Examples |
| --- | --- | --- |
| Shared runtime | `src/kernel/budget.ts` | `CONTEXT_WINDOW` (300,000), `BASH_OUTPUT_MAX_CHARS` (16,000) |
| Slice | `src/plugins/<plugin>/slices/<s>/limits.ts` | `JEV_TIMEOUT_MS` (45,000) in the slice `decide` |
| Repository | `tools/limits.ts` | `FILE_MAX_LINES` (300), `TEST_FILE_MAX_LINES` (500), `CLAUDE_MD_MAX_BYTES` (6 KB), `START_TOKENS` (9,960) |

- A slice with no bound has no `limits.ts`.
  Some slices have none, such as `prompt` in the core plugin, and `docs` in `claudetto-docs`.
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
- [Add-Ons](Add-Ons)
- [Bounds](Bounds)
- [Development](Development)
- [Sandbox](Sandbox)
