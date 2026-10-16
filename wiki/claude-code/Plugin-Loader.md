# Plugin Loader

This page describes how Claude Code finds a marketplace, installs a plugin, and loads its parts.
Read it if you publish a marketplace or a plugin, or if you debug a plugin load.
The facts are for Claude Code `2.1.296`.

## Sources

- Official docs, read on 2026-10-13: the plugin manifest reference, the plugin loading reference, the marketplace guide, and the mods reference.
  Where a fact comes from these docs, the text says so.
- Binary: I searched the extracted strings of `2.1.296` with `grep`.
  The strings name the variables, the file names, and the messages that this page cites.
  I copied no bundle code.
- Repository: `.claude-plugin/marketplace.json`, `plugins/*/.claude-plugin/plugin.json`, and the tests in `tests/support/`.

## Find a Marketplace

A marketplace is a folder or a repository with `.claude-plugin/marketplace.json`.
The file has a `name`, an `owner`, and a `plugins` array.
Each plugin entry has a `name` and a `source`.

The repository marketplace is `claudetto`.
Its entries list the core plugin `claudetto` and six add-on plugins.

`claude plugin marketplace add` registers a marketplace.
The docs show a GitHub `owner/repo` and a local path as arguments.
The command writes the marketplace to `extraKnownMarketplaces` in user settings and to disk.

Claude Code records each fetched marketplace in `known_marketplaces.json`.
The binary contains this file name.
The plugins root is `~/.claude/plugins`.
The variable `CLAUDE_CODE_PLUGIN_CACHE_DIR` moves it.
The binary contains that variable name.

## Install a Plugin

The install id is the entry name, an `@`, and the marketplace name, as in `claudetto@claudetto`.
An install runs these steps, according to the docs.

1. For a `name@marketplace` install, Claude Code refreshes that marketplace first.
   The refresh does not run when the marketplace is a local path.
   It also does not run when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set.
2. Claude Code copies the plugin to `cache/<marketplace>/<plugin>/<version>/`.
   A relative-path plugin in a marketplace that you added from a local path loads in place, with no copy.
3. Claude Code records the install in `installed_plugins.json`.
4. Claude Code writes `"<name>@<marketplace>": true` under `enabledPlugins` in the settings file of the scope.

The scopes are user, project, and local.
User scope enables the plugin in every project.
Project scope writes to the committed `.claude/settings.json`.
Local scope writes to `.claude/settings.local.json`.

## Load a Plugin

At session start, Claude Code reads `installed_plugins.json` and the cache, with no network access.
After the start, it checks the declared marketplaces in the background.
A running session does not see a change until `/reload-plugins` runs or a new session starts.

When two enabled plugins share a manifest name, one copy wins.
A `--plugin-dir` plugin replaces an installed plugin of the same name.

## Manifest Keys

The manifest is `.claude-plugin/plugin.json`.
It is optional, but `name` is the only required key.
Component folders go at the plugin root, not inside `.claude-plugin/`.

| Key | What it loads or does | Use in claudetto |
| :- | :- | :- |
| `name` | The namespace of every component | `claudetto` |
| `version` | Pins users to the cached copy until the value changes | `0.1.0-alpha.1` |
| `userConfig` | Values that Claude Code prompts for when the plugin is enabled | `decide` and `compaction` in the core plugin |
| `skills` | Adds directories to the default `skills/` scan | Not set |
| `commands` | Replaces the default `commands/` scan | Not set |
| `agents` | Replaces the default `agents/` scan | Not set |
| `hooks` | Adds hook files or inline hooks to `hooks/hooks.json` | Not set |
| `mcpServers` | Adds MCP servers to `.mcp.json` | Not set |
| `lspServers` | Adds language servers to `.lsp.json` | Not set |
| `outputStyles` | Replaces the default `output-styles/` scan | Not set |
| `settings` | Applies only `agent` and `subagentStatusLine` | Not set |
| `homepage`, `repository`, `keywords`, `description` | Listing and discovery metadata | Set |

The `hooks` key takes a file that wraps its event map in a top-level `hooks` key.
The docs say that a hooks file without that wrapper fails to load.

## Default Layout

Each component has a default location under the plugin root.
A default location loads when the manifest does not replace it.

| Location | Loads |
| :- | :- |
| `skills/<name>/SKILL.md` | Skills |
| `commands/` | Flat command files |
| `agents/` | Subagent files |
| `hooks/hooks.json` | Hooks, or a hooks module |
| `.mcp.json` | MCP servers |
| `.lsp.json` | Language servers |
| `output-styles/` | Output styles |
| `monitors/monitors.json` | Background monitors, in interactive sessions only |
| `settings.json` | Agent and status line defaults |
| `bin/` | Executables on the Bash tool `PATH` while the plugin is enabled |

The docs say that files in `bin/` run as bare commands.
They also say that claude.ai and Cowork do not install a plugin with a `bin/` folder.
The binary has a pattern that matches a command under `${CLAUDE_PLUGIN_ROOT}/bin/`.
That pattern supports the docs.
It does not prove the `PATH` behavior alone.

claudetto uses the default locations of `skills/`, `agents/`, `output-styles/`, `hooks/`, and `bin/`.
The `bin/` folder of the core plugin holds six files: `claudetto-decide`, `claudetto-gc`, `claudetto-run-checks`, `claudetto-setup`, `claudetto-statusline`, and `minispec`.

A component path must start with `./`.
It must stay inside the plugin root, and it must exist.

## Plugin Root Variable

`${CLAUDE_PLUGIN_ROOT}` resolves to the absolute path of the installed version folder.
A hook command receives it in its environment, and a shell-form command must quote it.
The docs say that the variable is absent from commands that Claude runs through the Bash tool.

The root changes on each version.
Keep durable state in `${CLAUDE_PLUGIN_DATA}`, which the docs place at `data/<plugin-id>/`.
The binary contains both `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA`.

The repository test `tests/support/plugin-hooks-exist.test.ts` reads command hooks that use `${CLAUDE_PLUGIN_ROOT}/<file>`.
It checks that each file exists.

## Cache Folder

The paths are relative to `~/.claude/plugins/`.
`CLAUDE_CODE_PLUGIN_CACHE_DIR` moves the root.

| Path | Holds |
| :- | :- |
| `cache/<marketplace>/<plugin>/<version>/` | One copy for each installed version |
| `data/<plugin-id>/` | The `${CLAUDE_PLUGIN_DATA}` folder, which survives updates |
| `marketplaces/<name>/` | A clone of a marketplace from GitHub, another git host, or a URL |
| `installed_plugins.json` | One record for each install, with its scope, path, and version |
| `known_marketplaces.json` | One record for each fetched marketplace |

A relative-path plugin in a local marketplace has no copy.
Its `${CLAUDE_PLUGIN_ROOT}` points at the source folder.

When a plugin updates, the old version folder receives an `.orphaned_at` marker.
The sweep removes that folder 14 days later.
The sweep runs only while `installed_plugins.json` records at least one install.
The binary contains the marker name.

The version decides an update.
The manifest `version` comes first.
Then the entry `version` decides, and then the commit SHA or file digest of the source.
Each claudetto plugin sets `version` in its manifest.
So a user keeps the cached copy until that string changes.
That is inference from the docs, not a test.

## Hook Module

The `hooks/hooks.json` of a claudetto plugin has the key `modules` with one path: `"modules": ["./register.ts"]`.

The official mods reference defines this form.
A hooks module is a file that exports `register(on, options)`.
Each `on(event, handler)` call registers a handler for one event.
`options` holds the `userConfig` values with defaults filled in.

claudetto generates `plugins/claudetto/hooks/register.ts` from the slices in `src/`.
`just generate` writes it, so do not edit it by hand.
The events, and the 14 claudetto events, are in [Hook Events](Hook-Events).
The path from `src/` to `plugins/` is in [Architecture](Architecture).

The `modules` form and the `hooks` form can appear in one file.
The `claudetto-codegraph` plugin uses both forms.
The core plugin uses both forms too, with the `hooks` form for `WorktreeCreate` and `WorktreeRemove`.
The other add-on plugins use only `modules`.

## Check a Plugin

`claude plugin validate <dir>` checks a plugin or a marketplace.
It prints `Validation passed`, `Validation passed with warnings`, or `Validation failed`.
`--strict` turns each warning into a failure.
`--json` prints a report for a script.
For a plugin with a hooks module, the command also lists the events and the API calls that the module makes.

The binary contains `claude plugin validate`, `Validation passed`, and the message that names both manifest files.

`claude plugin test <dir>` runs each file that ends in `.test.ts` under the folder.
It exits with status 1 when a test fails.
`tools/lab.ts` runs it for each plugin folder that has a `tests/` folder.
`just lab` runs that tool.

The repository tests cover the manifests.
`tests/support/manifests.test.ts` checks that the marketplace lists each plugin once.
It checks that each `plugin.json` description equals its marketplace entry.
It checks the `$schema`, the `keywords`, and the `homepage`.

`tests/support/plugin-hooks-exist.test.ts` reads only the `hooks` key of `hooks/hooks.json`.
It checks the commands of `claudetto` and `claudetto-codegraph`, because only those two plugins have that key.
It does not check that `register.ts` exists.

## Limits of This Page

- The cache folder layout comes from the docs.
  I did not find the folder string in the binary.
- I did not run `claude plugin validate` or `claude plugin test` on this repository.
  The main session runs those checks.

## Related Pages

- [Settings Resolution](Settings-Resolution)
- [Hook Events](Hook-Events)
