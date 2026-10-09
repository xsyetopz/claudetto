# Plugin layout

This page says how the repository, the marketplace, and the plugins are laid out.
The decisions are D17, D18, D20, and D24 in [Decisions](Decisions-Layout).
The runtime rules and the bound tiers are in [Runtime rules](Runtime-Rules).

## Marketplace and plugins

The repository root is the marketplace root.
`.claude-plugin/marketplace.json` lists the plugins in this order:

| Plugin | What it is |
| --- | --- |
| `dotclaude` | The core plugin. |
| `dotclaude-codegraph` | Code graph context ([Code graph](Code-Graph)). |
| `dotclaude-jev` | Second opinion with Jev ([Second opinion](Second-Opinion)). |
| `dotclaude-browser` | Headless browser and web search replacement ([Browser](Browser)). |
| `dotclaude-docs` | Library docs from Context7 ([Library docs](Library-Docs)). |

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
  skills/<name>/SKILL.md       setup and handoff, each with its own scripts/
  hooks/hooks.json             the module (one path) and the classic hooks
  hooks/register.mjs           the one hooks module
  output-styles/dotclaude.md   the forced output style
  tests/*.test.ts              the hook lab
  lib/                         pure shared code
  features/<name>/             one folder for each concern
```

A feature folder holds `rules.mjs` for pure logic and `limits.mjs` for its own bounds.
It may also hold `cli.mjs` for a classic hook, and `data.mjs` for tables.
The features are `autofix`, `context`, `drift`, `guard`, `prompt`, `reads`, `router`, `sembr`, `setup`, `statusline`, and `surface`.

## Dependency rule

1. An entry point imports its own `features/<name>/` folder and `lib/`.
   The entry points are `hooks/register.mjs`, each `features/*/cli.mjs`, the skill scripts, and the status line.
1. A feature imports `lib/` and its own folder.
   It never imports another feature.
   Shared code moves to `lib/`.
1. `lib/` imports only `lib/`.
1. `tools/` and `tests/` can import `plugins/`.
   `plugins/` never imports them.
1. A plugin imports nothing from another plugin.

An import test (`tests/dotclaude/imports.test.mjs`) parses the `import` lines and fails on a break of these rules.

## The hooks module

- `hooks/register.mjs` is the only hooks module.
  It holds the literal `on()` lines and the top-level `$` functions.
- Claude Code follows `$` calls only into a function of the module file.
  The glue of a feature that has `$` calls can sit in a feature file that the module imports (probe P1 in `research/probes-3.md`).
- When `hooks/register.mjs` passes 250 lines, the next feature becomes an add-on plugin with its own module.
- A module file imports by relative path inside the plugin, because the cache copy has no file outside it.
  No file in its graph has a `node:` import ([Runtime rules](Runtime-Rules)).

## Add-on plugins

A feature that costs tokens when unused, or that needs an outside tool, is an add-on plugin.
The plugin is the unit of install and disable, so the user turns the feature off by the plugin.
A plugin skill keeps its listing line until the whole plugin is off ([Commands](Commands#small-listing)).

- Each add-on works without `dotclaude`.
  It imports nothing from `dotclaude` or from another add-on.
- Each add-on has its own limits module for its own bounds.
- The add-ons have the same shape as the core plugin, but smaller.

## Roles

dotclaude is a set of general software-engineering roles.
No plugin or agent description names a game, a modding task, or another niche, and a test reads the descriptions for this.

## Modder removed

0.28.0 removed `dotclaude-modder` from the marketplace and from `plugins/`.
An archive is in `external/archive/dotclaude-modder/`, which git ignores.
You can build your own skills or tools from it ([Development](Development)).

## Related pages

- [Runtime rules](Runtime-Rules)
- [Parts](Parts)
- [Development](Development)
