# Plugin layout

This page says how the repository, the marketplace, and the plugins are laid out.
The decisions are D17, D18, D20, and D24 in [Decisions](Decisions-Layout).
The runtimes, the bound tiers, and the file size bounds are on this page too.

## Marketplace and plugins

The repository root is the marketplace root.
`.claude-plugin/marketplace.json` lists the plugins in this order:

| Plugin | What it is |
| --- | --- |
| `dotclaude` | The core plugin ([Core plugin](Core-Plugin)). |
| `dotclaude-codegraph` | Code graph context ([Code graph](Code-Graph)). |
| `dotclaude-jev` | Second opinion with Jev ([Second opinion](Second-Opinion)). |
| `dotclaude-browser` | Headless browser and web search replacement ([Browser](Browser)). |
| `dotclaude-docs` | Library docs from Context7 ([Library docs](Library-Docs)). |
| `dotclaude-sessions` | Usage and session start measures ([Sessions](Sessions)). |
| `dotclaude-lab` | Sandbox, capture, schema, and eval tools ([Lab](Lab)). |

The layout follows the plugin and marketplace docs of Claude Code:

- Each plugin has its manifest at `.claude-plugin/plugin.json`.
  Its components are in the default folders.
- Each component path in a manifest starts with `./`, stays inside the plugin root, and exists.
- Each marketplace entry name equals the manifest name.
- `claude plugin validate` passes on the marketplace and on each plugin.
- `CLAUDE.md` at a plugin root does not load, so no plugin has one.

## The core plugin tree

```text
plugins/dotclaude/
  .claude-plugin/plugin.json   manifest
  agents/*.md                  the five agents
  settings.json                keys that a plugin may set (an empty object)
  skills/<name>/SKILL.md       the setup skill, with its own scripts/
  hooks/hooks.json             the module (one path) and the classic hooks
  hooks/register.ts            the one hooks module
  hooks/<event-type>/<name>.ts the classic hooks, one folder for each event type
  output-styles/dotclaude.md   the forced output style
  tests/*.test.ts              the hook lab
  lib/                         pure shared code
  features/<name>/             one folder for each concern
```

A feature folder holds `rules.ts` for pure logic and `limits.ts` for its own bounds.
It may also hold `data.ts` for tables.
The features are `adherence`, `context`, `drift`, `guard`, `prompt`, `reads`, `sembr`, `setup`, `statusline`, and `surface`.

## Dependency rule

1. An entry point imports `lib/` and features.
   The entry points are `hooks/register.ts`, each `features/*/cli.ts`, the skill scripts, and the status line.
2. A feature imports `lib/` and its own folder.
   It never imports another feature.
   Shared code moves to `lib/`.
3. `lib/` imports only `lib/`.
4. `tools/` and `tests/` can import `plugins/`.
   `plugins/` never imports them.
5. A plugin imports nothing from another plugin.

An import test (`tests/dotclaude/imports.test.ts`) parses the `import` lines and fails on a break of these rules.

## The hooks module

- `hooks/register.ts` is the only hooks module.
  It holds the literal `on()` lines and the top-level `$` functions.
- Claude Code follows `$` calls only into a function of the module file.
  The glue of a feature that has `$` calls can sit in a feature file that the module imports (probe P1 in `research/probes-3.md`).
- When `hooks/register.ts` passes 250 lines, the next feature becomes an add-on plugin with its own module.
- A module file imports by relative path inside the plugin, because the cache copy has no file outside it.
  No file in its graph has a `node:` or `bun:` import, or uses the `Bun` global ([Runtimes](#runtimes)).

## Runtimes

| Code | Runtime |
| --- | --- |
| Code that needs Python | Python, with the standard library or a pinned requirement. |
| Runtime JavaScript in `plugins/` | `.ts` and `.mjs` files on Bun 1.4.3 or later, with `node:` modules, `bun:` modules, and the `Bun` global. |
| Tests and `tools/` | Bun 1.4.3 or later, with `bun test` for the tests. |

- A plugin ships no `.js` file.
  Its `.ts` files are runtime code, the `.test.ts` files are the hook lab that `claude plugin test` runs, and a `types/*.d.ts` file is allowed only when a manifest names it.
- A test lists the files under `plugins/` and fails on any other script type (`tests/support/runtimes.test.ts`).
- The hooks module runs with no Bun and no Node.
  A file in the import graph of `hooks/register.ts` therefore has no `node:` or `bun:` import, and no use of the `Bun` global.
  The import test fails on one.
  Any file outside that import graph can use `node:`, `bun:`, and the `Bun` global, such as the `cli.ts` entry of the status line.
- When the module needs a system call, it uses a `$` function, such as `$.process.run`.
- The `sembr` formatter in `lib/sembr.ts` is pure string code with no import, so the module can load it.

## Bound tiers

Each bound has one owner.
Tests pin the copies of a bound in code and config, not in prose.

| Tier | File | What it holds |
| --- | --- | --- |
| Shared runtime | `plugins/dotclaude/lib/budget.ts` | Bounds that two or more parts read: `CONTEXT_WINDOW`, `USAGE_LEVELS`, `BASH_OUTPUT_MAX_CHARS`, and the policy bounds. |
| Feature | `features/<name>/limits.ts`, or the own module of an add-on | Bounds that one feature reads, such as `SUBAGENT_CONTEXT_MAX` and the allowed efforts of each model. |
| Repository | `tools/limits.ts` | Bounds that only tests and tools read, such as the file size bounds, the size targets of `CLAUDE.md`, skills, and the first request, and `START_TOKENS`. |

- No router table exists.
  The frontmatter of `agents/*.md` is the source of the model, the effort, and `maxTurns` ([Agents](Agents#pins)).
- `just measure` prints the size of the first request and fails above `START_TOKENS`.
  It writes no file.
- `userConfig` is for a choice that the user makes, which the module reads as `options`.
  The status line cannot read `options`, so its bounds stay in `budget.ts` and `features/statusline/limits.ts`.
  Each plugin with options costs one dialog at install, so a plugin adds an option only for a real user choice.

## File size

- A normal file has 300 lines or fewer.
- A test file has 500 lines or fewer.
- `FILE_MAX_LINES` and `TEST_FILE_MAX_LINES` are in `tools/limits.ts`.
  A test in `tests/support/file-size.test.ts` fails on a file over its bound and names the file.
- Generated files, such as `schemas/` and lock files, are excluded by name.
- The 300-line bound also applies to Markdown files, so a long page is split into linked pages.
- A test searches `plugins/` for the repository bounds and finds none.

## Add-on plugins

A feature that costs tokens when unused, or that needs an outside tool, is an add-on plugin.
The plugin is the unit of install and disable, so the user turns the feature off by the plugin.
A plugin skill keeps its listing line until the whole plugin is off ([Core plugin](Core-Plugin#skills)).

- Each add-on works without `dotclaude`.
  It imports nothing from `dotclaude` or from another add-on.
- `dotclaude-codegraph`, `dotclaude-browser`, and `dotclaude-jev` each have a `features/<name>/limits.ts` for their own bounds.
  `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab` have no limits module.
- The add-ons have the same shape as the core plugin, but smaller.

## Roles

dotclaude is a set of general software-engineering roles.
No plugin or agent description names a game, a modding task, or another niche, and a test reads the descriptions for this.

## Modder removed

0.28.0 removed `dotclaude-modder` from the marketplace and from `plugins/`.
Its files are in git history at commit `5cf4cb4`, in `plugins/dotclaude-modder/`.
You can build your own skills or tools from it ([Development](Development)).

## Related pages

- [Decisions: layout](Decisions-Layout)
- [Core plugin](Core-Plugin)
- [Development](Development)
