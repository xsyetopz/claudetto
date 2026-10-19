# Claude Code Plugins: Loader

The loader finds plugins, copies them into a cache, and turns their parts on.
The paths, the variables that a plugin can use, and the env vars and settings that change loading are listed below.
For example, `${CLAUDE_PLUGIN_ROOT}` in a hook command is the folder of the plugin.
The marks are explained on [Plugins](Claude-Code-Plugins).

## Paths

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `~/.claude/plugins/` | Plugins root. | Env `CLAUDE_CODE_PLUGIN_CACHE_DIR` sets this parent, not the cache itself. | Local | [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `plugins/data/<id>/` | `${CLAUDE_PLUGIN_DATA}`. | Made on first use. Survives updates. `<id>` has characters other than letters, digits, `_`, `-` replaced by `-`. Deleted on the last uninstall unless `--keep-data`. | Local | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |
| 🔍 | `plugins/cache/<marketplace>/<plugin>/<version>/` | One copy of each installed version. | A cache path with three parts is parsed this way. A `.zip` version is excluded. | Local | bundle |
| ✅ | Markers `.orphaned_at`, `.in_use`, `.gcs-sha`, `.links_materialized` | State files in a version folder. | `.orphaned_at` is written only inside the cache root and not on a symlinked version. | Local | [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| 🔍 | `plugins/installed_plugins.json` | Install records. | Fields: `version`, `installedAt`, `lastUpdated`, `installPath`, `gitCommitSha`, `resolvedVersion`, `auto` (a dependency install). | Local | bundle |
| 🔍 | `plugins/known_marketplaces.json` | Marketplace records. | Fields: `source`, `installLocation`, `lastUpdated`, `autoUpdate`. Clones live in `plugins/marketplaces/<name>`. | Local | bundle |
| 🔍 | Registry files `installed`, `marketplaces`, `flagged`, `catalog`, `inUseSweep` | Named files of the plugin registry. | Names from the bundle list. | Local | bundle |
| ✅ | `~/.claude/plugins/synced` | Plugins synced from claude.ai. | Id `<name>@synced`. Off with `syncClaudeAiPlugins: false`. | claude.ai sign-in | schema |

## Variables

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `${CLAUDE_PLUGIN_ROOT}` | Installed plugin folder. | Changes on update. Do not write state there. | Hook `command` and `args`, monitor `command`, MCP stdio `command`, `args`, `env`, MCP remote `url`, `headers`, `headersHelper`, LSP fields, skill and agent text | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| ✅ | `${CLAUDE_PLUGIN_DATA}` | Data folder. | Exported to hooks, MCP stdio, LSP. | Same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| ✅ | `${CLAUDE_PROJECT_DIR}` | Project root. | Exported to hooks and LSP. | Same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | `${user_config.KEY}` | Saved option. | Not allowed in shell-form hooks, monitor commands, or `headersHelper`. | MCP, LSP, exec-form hook `args`, skill and agent text | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |
| ✅ | `CLAUDE_PLUGIN_OPTION_<KEY>` | Option in the env of hooks. | Upper case key. | Hooks | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | Not in Bash tool env | Variables are absent from commands Claude runs. | Write the reference in Markdown text instead. | Skills | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |

Non-sensitive option values are saved in `pluginConfigs` of user settings.
Sensitive values go to the credential store.
Source: [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference).

## Env Vars and Settings

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `CLAUDE_CODE_PLUGIN_DIRS` | Plugin dirs for the session. | Like `--plugin-dir`. separated by a colon on Unix and a semicolon on Windows. | Env | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| ✅ | `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | Git timeout. | Default 120000. | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | Keep the checkout when a refresh fails. | Set `1`. | Env | [Host and Maintain a Marketplace](https://code.claude.com/docs/en/plugins/host-marketplace), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | Clone GitHub shorthand over HTTPS. | Set `1`. | Env | [Host and Maintain a Marketplace](https://code.claude.com/docs/en/plugins/host-marketplace), [Install and Manage Plugins](https://code.claude.com/docs/en/plugins/install) |
| ✅ | `CLAUDE_CODE_PLUGIN_SEED_DIR` | Read-only seed folders. | Registers marketplaces at start and uses pre-cached plugins. | Env | [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `CLAUDE_CODE_PLUGIN_DIR_WATCH` | Reload a mod on file change. | On by default in interactive sessions. | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `FORCE_AUTOUPDATE_PLUGINS` | Update plugins even when `DISABLE_AUTOUPDATER` is set. | Set `1`. | Env | [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading), [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org) |
| 🔍 | `CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE`, `CLAUDE_CODE_PLUGIN_BINARY_ASSETS`, `CLAUDE_CODE_PLUGIN_ATTRIBUTION`, `CLAUDE_CODE_PLUGIN_ARCHIVE_URL`, `CLAUDE_CODE_PLUGIN_NAME`, `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS`, `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT`. | Plugin env names. | Found in the env inventory. Zip cache mode is mentioned in bundle messages ("zip cache mode"). | Env | `inv-2.1.303.json` |
| ✅ | `CLAUDE_CODE_SYNC_PLUGINS` and `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` with `_TIMEOUT_MS` variants | Sync of claude.ai plugins in headless runs. | Effects are not documented. | Env | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `enabledPlugins` | `"name@marketplace": true\|false`. | Order user, project, local, flag, policy. To turn off a project plugin set `false` in `.claude/settings.local.json`. Also holds extended version-constraint forms. | Settings | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `pluginConfigs` | Saved options by plugin id. | Holds `options` and `mcpServers`. | Settings | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org) |
| ✅ | `strictPluginOnlyCustomization` | Limits customization to plugins. | Managed. Array of surfaces such as `skills`, `hooks`, or `true`. | Managed | [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableSideloadFlags` | Rejects `--plugin-dir`, `--plugin-url`, `--agents`, `--mcp-config`. | Managed. | Managed | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org) |
| ✅ | `prependPlugins`, `appendPlugins` | Hook order of managed plugins. | Managed. Ids listed are outermost or innermost. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `allowedChannelPlugins`, `pluginTrustMessage` | Channel allowlist and trust text. | Managed. | Managed | [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## See Also

- [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) is the docs page.
- [Settings: Hooks and Plugins](Claude-Code-Settings-Hooks-And-Plugins) lists the plugin settings keys.
