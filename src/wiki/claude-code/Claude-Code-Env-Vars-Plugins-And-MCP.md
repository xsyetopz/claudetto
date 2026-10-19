# Claude Code Environment Variables: Plugins and MCP

These 97 environment variables of Claude Code `2.1.303` cover plugins, MCP servers, skills, hooks, and marketplaces.
A plugin adds skills, hooks, or MCP servers to Claude Code.
An environment variable is a named setting that you put in your shell or in the `env` key of `settings.json`.

## Example

Run `export CLAUDE_CODE_PLUGIN_DIRS=/path/to/plugin` before `claude` to load a plugin from a folder.
Or put `{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/plugin" } }` in `~/.claude/settings.json`.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS` | 🔍 | Turns off the capture of SDK MCP server manifests in the session setup. | On or off. The code passes `captureSdkMcpManifests` as false when the value is set | SDK hosts. Not set from project `env` before trust |
| `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | ✅ | Skips the `mcp__<server>__` prefix on tool names from SDK-created MCP servers. | On or off. Applies to MCP servers of type `sdk` and to auto mode `toolAliases` | SDK use only. Not set from project `env` before trust |
| `CLAUDE_CODE_ARTIFACT_MCP` | 🔍 | A getter returns its value, or `true` when unset, next to the artifact MCP tool schema. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | `true` by default | Artifacts |
| `CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC` | 🔍 | Starts the first plugin sync early in a cloud session. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. Applies only to non-interactive sessions | Cloud sessions |
| `CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC` | 🔍 | Starts the first skills sync early in a cloud session. | On or off. Applies only to non-interactive sessions | Cloud sessions |
| `CLAUDE_CODE_CCR_FOLD_FIRST_TURN_RESCAN` | 🔍 | Folds the command rescan into the first turn when plugin startup is still pending. Else it refreshes commands right after the skills sync. | On or off | Cloud sessions |
| `CLAUDE_CODE_CCR_SURFACE` | 🔍 | Set to `tag` to add the `claude-tag-plugins` default marketplace to plugin download and plugin search requests. | Text. Only the value `tag` has an effect | Cloud sessions |
| `CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR` | 🔍 | Gives the desktop skills plugin folder to Claude Code, then Claude Code removes it from the environment. A [Probes](Claude-Code-Probes) run saw no effect. | Text | Desktop app |
| `CLAUDE_CODE_DESKTOP_SKILL_SWITCHES` | 🔍 | Claude Code stores the value in its host config at startup. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default | Desktop app |
| `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` | ✅ | Removes bundled skills and workflows. Same effect as the `disableBundledSkills` setting. | On or off. Messages name both the setting and the variable | All sessions. Project `env` can set it before trust |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` | ✅ | Keeps the Chrome tools but empties the Chrome system prompt section and disables the `/claude-in-chrome` skill. | On or off | Claude in Chrome |
| `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` | 🔍 | Turns off the bundled `claude-api` skill when Claude Code registers its bundled skills. | On or off | All sessions |
| `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL` | 🔍 | Turns off the bundled Claude Code skill when Claude Code registers its bundled skills. | On or off | All sessions |
| `CLAUDE_CODE_DISABLE_HOOK_FORWARDING` | 🔍 | Marks hook forwarding as disabled in the hook admission check. Also turns off a hook forwarding gate on non-Windows systems. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default | SDK and remote sessions |
| `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND` | 🔍 | A getter returns it next to an internal flag and an internal flags. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default | MCP. Project `env` can set it before trust |
| `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` | ✅ | Stops the automatic registration of the official plugin marketplace. | On or off. Read when the install is about to run | All sessions |
| `CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS` | ✅ | Stops `Notification` hooks for unanswered permission requests sent to `canUseTool`. | On or off. The helper returns a no-op when set | Desktop and IDE hosts using the SDK |
| `CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING` | 🔍 | Turns off forwarding of local plugins to cloud sessions. It hides the `cloud-plugins` command. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default. Also passed as `disabled` to the plugin admission check | Cloud and remote sessions |
| `CLAUDE_CODE_DISABLE_POLICY_SKILLS` | ✅ | Skips skills from the system-wide managed skills directory. | On or off. The loader skips the `policySettings` source | All sessions |
| `CLAUDE_CODE_DISABLE_WORKFLOWS` | ✅ | Turns off workflows. Same as the `disableWorkflows` setting. | On or off. An env value is reported as a managed source, not a user setting | All sessions. Project `env` can set it before trust |
| `CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH` | ✅ | Refreshes plugin state at turn boundaries after a background install finishes. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default. Stored as `backgroundRefreshEnabled` at first message | Non-interactive mode |
| `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` | ✅❌ | Nothing reads it in 2.1.303. | Text | Project `env` can set it before trust |
| `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS` | 🔍 | Adds the `RefreshMcpTools` tool, which re-queries connected MCP servers for their tools. | On or off, off by default. Read when the tool list is built | All sessions |
| `CLAUDE_CODE_HIDE_REPLY_SERVER_NAME` | 🔍 | Tells the model not to name the app's own reply tool server or its failure, and not to ask the user to reconnect it. | On or off. Counts only when the MCP server is the built-in app server. Changes the status text sent to the model | Desktop or host apps with a built-in reply server |
| `CLAUDE_CODE_HOOKS_SAME_THREAD` | 🔍 | Runs plugin hooks modules on the main thread instead of a worker thread. | On or off. Unset uses a `worker`. The test harness for hooks modules also sets it | All sessions, plugin hooks modules |
| `CLAUDE_CODE_HOST_SKILL_CATALOG` | 🔍 | Gives the host skill catalog as JSON with a `skills` list of 1 to 64 folder names. A bad value is ignored with a warning. | Text. Read only with `CLAUDE_CODE_REMOTE_SESSION_ID` and then removed from the env | Remote sessions with a host |
| `CLAUDE_CODE_INVOKED_SKILLS` | 🔍 | The name is a constant next to `CLAUDE_CODE_EXECPATH` in the code that writes the `claude` shell function. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Name found in a constant and in a list of env keys. No direct read shown | Bash tool shell setup |
| `CLAUDE_CODE_LANTERN_PRISM` | 🔍🧪 | Turns on an internal flag path by env. Probe: Adds the `skill-doctor` skill to the `init` event. See [Probes](Claude-Code-Probes). | On or off. The name sits next to the `claude plugin eval` text | All sessions |
| `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` | ✅ | Sets the longest MCP tool description and server instructions text sent to the model. | A number. Whole number min `1`, digits only. Replaces the defaults `4096` and the larger tool-search limit | All sessions, MCP. Project `env` can set it before trust |
| `CLAUDE_CODE_MCP_ALLOWLIST_ENV` | ✅⚠️ | Starts stdio MCP servers with a safe base env plus the server `env`. Docs omit that the `local-agent` entrypoint turns it on by default. | Text. A true value turns it on, a false value turns it off, unset is on only for the `local-agent` entrypoint | Stdio MCP servers |
| `CLAUDE_CODE_MCP_ALWAYS_LOAD_JOIN_BEFORE_INPUT` | 🔍 | Joins the connection of `alwaysLoad` MCP servers before the first input, when other checks pass. | On or off. Used in the MCP connect planner next to the `alwaysLoad` field | MCP startup |
| `CLAUDE_CODE_MCP_APPS_HOST` | 🔍 | Declares MCP Apps support to MCP servers by adding the `io.modelcontextprotocol/ui` extension and the `text/html` MIME type with the `mcp-app` profile. | On or off. Also on the list of vars that force a copy of the env | MCP client, host apps |
| `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` | ✅⚠️🧪 | Sets the time before a running MCP tool call moves to the background. Docs omit the gates below. | A number of milliseconds. Whole number, `0` turns it off, capped at a max. Unset follows a feature flag | All sessions, MCP tool calls |
| `CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS` | 🔍 | Sets how long the first turn waits for claude.ai connectors, capped at a built-in max. | A number of milliseconds. Whole number min `1`. Read only for sessions with an SDK URL that are not under the `CLAUDE_CODE_ENVIRONMENT_KIND` is `bridge` check | Remote SDK-URL sessions |
| `CLAUDE_CODE_MCP_MEMORY_CGROUP` | 🔍🧪 | Turns off the memory cgroup limit for MCP server processes when set to a false value or to `none`. | Text. Otherwise a feature flag set to `false` also turns it off | Linux |
| `CLAUDE_CODE_MCP_PREWAIT_SERVERS` | 🔍 | Names MCP servers to wait for at start-up. Servers with no `--mcp-config` row are listed and not waited for. | Text. Read only for sessions with an SDK URL. Works with `CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS` | Remote SDK-URL sessions |
| `CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS` | 🔍 | Sets how long to wait for the servers in `CLAUDE_CODE_MCP_PREWAIT_SERVERS`. | A number of milliseconds. Whole number min `0`, digits only. Read only for sessions with an SDK URL | Remote SDK-URL sessions |
| `CLAUDE_CODE_MCP_SERVER_NAME` | ✅ | Gives the MCP server name to a `headersHelper` script. | Text. Set by Claude Code in the env of the `headersHelper` process | MCP servers with a `headersHelper` |
| `CLAUDE_CODE_MCP_SERVER_URL` | ✅ | Gives the MCP server URL to a `headersHelper` script. | Text. Set by Claude Code in the env of the `headersHelper` process | MCP servers with a `headersHelper` |
| `CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN` | 🔍 | Gives the MCP serve mode a bearer value for its auth. Without it the mode uses a stdout reader. | Text (a secret). Read from the env once and then removed. Also cleared from child process env | MCP serve mode |
| `CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION` | 🔍 | Asks for a minimum `anthropic/toolHostInterface` version. A value that differs from the real one is ignored and logged. | Text. The log event is `launch_min_version_ignored` | MCP serve mode |
| `CLAUDE_CODE_MCP_SERVE_SETTINGS` | 🔍 | Gives launch settings as JSON with `permissions.allow` and `permissions.deny` rules. Without readable settings the server runs nothing. | Text. Also on the list of vars that force a copy of the env | MCP serve mode |
| `CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT` | 🔍 | Lets the MCP serve mode return tool output objects. Needs launch rules from `CLAUDE_CODE_MCP_SERVE_SETTINGS`. | On or off. Boolean, true only as `true`. Otherwise the server refuses calls that ask for an output object | MCP serve mode |
| `CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT` | 🔍 | Sets the workspace root of the MCP serve mode. It must be an absolute path of at most 4096 characters. | Text. A bad path gives the fault `bad_path` | MCP serve mode |
| `CLAUDE_CODE_MCP_STARTUP_WAIT_MS` | ✅ | Sets how long the first turn of a non-interactive session waits for MCP servers that still connect. | A number of milliseconds. Whole number min `0`, capped at a built-in max. `0` skips the wait | Non-interactive sessions |
| `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` | ✅ | Sets the idle timeout of MCP tool calls. | A number. Whole number. Defaults `300000` for network servers and `1800000` for stdio | MCP tool calls except IDE and SDK servers |
| `CLAUDE_CODE_PLUGIN_ATTRIBUTION` | 🔍 | Supplies attribution data per plugin ID, such as the marketplace name. It wins over the normal lookup. A [Probes](Claude-Code-Probes) run saw no effect. | Text. Bad fields log a warning. Claude Code removes it from the env of shell subprocesses | All sessions |
| `CLAUDE_CODE_PLUGIN_BINARY_ASSETS` | 🔍🧪 | Turns on fetching of binary plugin assets from a marketplace. It is also on when an internal flag is true. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. Failures raise a `PluginAssetFetchError`. Assets are cached under the plugin asset cache dir | Plugins from some marketplaces |
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` | ✅ | Sets the plugins root dir. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. Default is `plugins` under the config dir (`cowork_plugins` in cowork mode). Also the base dir of the zip cache | All sessions |
| `CLAUDE_CODE_PLUGIN_DIRS` | ✅ | Loads plugin dirs for the session like `--plugin-dir`. Probe: Loads the plugin dir like `--plugin-dir` (same `plugins` list in `init`). See [Probes](Claude-Code-Probes). | Text. Relative paths are skipped with a warning. Claude Code writes the cleaned list back to the var | All sessions |
| `CLAUDE_CODE_PLUGIN_DIR_WATCH` | ✅ | Turns on reload of plugins loaded with `--plugin-dir` when files change. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On, off, or unset. Default is on in interactive sessions and off in non-interactive ones. `0` turns it off everywhere | All sessions |
| `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | ✅ | Sets the timeout for a plugin marketplace git clone or refresh. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A number of milliseconds, `120000` by default. Whole number in ms above 0. The timeout error text names this var | All sessions |
| `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | ✅ | Keeps the existing marketplace clone when the remote is unreachable at refresh. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. Logs a warning and returns a `kept-stale` result instead of re-cloning | All sessions |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | ✅ | Clones GitHub shorthand sources over HTTPS and not SSH. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. The same check is also true when `CLAUDE_CODE_REMOTE` is set, which the docs do not say | All sessions |
| `CLAUDE_CODE_PLUGIN_SEED_DIR` | ✅ | Names read-only plugin seed dirs for containers. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. Each path is normalized | All sessions |
| `CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE` | 🔍 | Turns on the plugin zip cache. It needs `CLAUDE_CODE_PLUGIN_CACHE_DIR`. A [Probes](Claude-Code-Probes) run saw no effect. | On or off. Without the cache dir the zip cache code throws `Plugin zip cache is not enabled` | All sessions |
| `CLAUDE_CODE_RESULT_NONCE` | 🔍 | Adds a nonce to the JSON result line of plugin commands. | Text. Read once at startup and then removed from the env | Plugin commands |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | ✅ | Overrides the time budget in ms for `SessionEnd` hooks. Without it the budget is 1.5 s, raised to the highest hook `timeout` up to 60 s. | A number of milliseconds. Integer 1 or more. Org-defined hooks read it through a managed-source path | Session exit, `/clear`, `/resume` |
| `CLAUDE_CODE_SKILL_ATTRIBUTION` | 🔍 | Supplies a JSON map that attributes skills to plugins or sources. Claude Code looks up each skill in it. | JSON text. Bad entries are logged and ignored. Removed from the env of child processes | Skill loading, hosts |
| `CLAUDE_CODE_SKILL_PROPOSALS` | 🔍 | Turns on the skill proposals tool and its prompt text, which let the model propose skills for the user to save. | On or off. Needs `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` to be set and skill sync to be off | Remote environments |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | 🔍 | Skips MCP server discovery for plugins, except for plugins in the `_EXCEPT` list. A [Probes](Claude-Code-Probes) run saw an empty `mcp_servers` list. | On or off. The skip is logged per plugin | All plugin loading |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT` | 🔍 | Lists plugins that keep their MCP servers when `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` is set. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A comma-separated list. Empty items are ignored | All plugin loading |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | ✅ | Sets how many times in a row a `Stop` or `SubagentStop` hook may block the turn end before Claude Code ends the turn anyway. | A number, `8` by default. Integer, default `8`. `0` turns the cap off | Stop and SubagentStop hooks |
| `CLAUDE_CODE_SYNC_PLUGINS` | ✅ | Turns on the sync of the account plugin list from the Claude server. The sync downloads plugins before use. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. It also turns on the sync gates for session refs | Remote and account plugin sync |
| `CLAUDE_CODE_SYNC_PLUGINS_BUFFERED_DOWNLOAD` | 🔍 | Downloads synced plugins as one buffered request. Without it the download uses a stream with a stall guard. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Plugin sync |
| `CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS` | 🔍 | Sets how long a plugin download stream may get no data before it is cut. The error says the stream stalled. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A number of milliseconds, `60000` by default. Integer 1 or more, default `60000` ms | Plugin sync |
| `CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS` | 🔍 | Sets the time limit in ms for the install step of the plugin sync. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A number of milliseconds, `30000` by default. Integer 1 or more, default `30000` | Plugin sync |
| `CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS` | 🔍 | Sets the time limit in ms for the MCP step of the plugin sync. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A number of milliseconds, `10000` by default. Integer 0 or more, default `10000` | Plugin sync |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | ✅ | Makes a non-interactive run wait for plugin install before the first query. A [Probes](Claude-Code-Probes) run saw `plugin_install` events in stream-json. | On or off. Takes effect only in a mode with a storage backend. Pair with the timeout variable | Print mode `-p` |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS` | ✅ | Bounds the wait for synchronous plugin install. After the limit Claude Code goes on without plugins and logs an error. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A number of milliseconds. Integer 1 or more. Default is `0`, which means no limit | Print mode `-p` |
| `CLAUDE_CODE_SYNC_REUSE_WITHIN_MS` | 🔍 | Sets a window in ms in which a recent sync stamp is reused. Details of the stamp were not read. | A number of milliseconds. Integer 0 to 86400000. A value of 0 or less turns reuse off | Plugin and skills sync |
| `CLAUDE_CODE_SYNC_SESSION_REFS` | 🔍 | Turns on sync of the plugins and skills that a remote session lists. It needs a CCR session ID. | On or off. Counts as a switch for both plugin sync and skills sync | Remote sessions |
| `CLAUDE_CODE_SYNC_SKILLS` | ✅ | Makes a `-p` run download the skills enabled for your claude.ai account and wait for the list before the first query. | On or off. Needs claude.ai auth. Docs match | Print mode `-p` |
| `CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS` | ✅ | Sets the timeout in ms for the mid-session skills resync when an SDK app reloads skills. Late skills finish in the background. | A number of milliseconds, `30000` by default. Integer. A value of 0 or less uses the default `30000` | Agent SDK apps |
| `CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS` | ✅ | Sets how long the first query waits for the first skill list when `CLAUDE_CODE_SYNC_SKILLS` is set. | A number of milliseconds, `5000` by default. Integer. A value of 0 or less uses the default `5000` ms | Print mode `-p` |
| `CLAUDE_CODE_USE_COWORK_PLUGINS` | 🔍 | Makes Claude Code read `cowork_settings.json` and the `cowork_plugins` folder in place of `settings.json` and `plugins`. A [Probes](Claude-Code-Probes) run did not run the hooks of `settings.json`. | On or off | Cowork hosts |
| `CLAUDE_PLUGIN_DATA` | ✅ | Gives a plugin hook command the path of the data directory of that plugin. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | - |
| `CLAUDE_PLUGIN_ROOT` | ✅ | Gives a plugin hook command the path of the plugin root directory. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | - |
| `CLAUDE_PROJECT_DIR` | ✅ | Gives each hook command the project directory. | A path | - |
| `CLAUDE_SCRIPT_HOOK_ACK` | 🔍 | The hook spawn code reads this key from a per-hook env map, not from `process.env`. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | - | - |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | ✅ | Stops the fetch of claude.ai MCP servers when set to `false`. | On, off, or unset. `false`/`0`/`no`/`off` disables and logs "Disabled via env var" | Logged-in users. Not set from project `env` before trust |
| `ENABLE_LSP_TOOL` | 🔍❌ | In the schema, but nothing reads it. | On or off | Nowhere, nothing reads it |
| `ENABLE_MCP_LARGE_OUTPUT_FILES` | 🔍 | When `false`, large MCP tool results are truncated and not saved to a file. | On, off, or unset. Only `false` is checked. The event reason is `env_disabled` | MCP tool results. Not set from project `env` before trust |
| `FORCE_AUTOUPDATE_PLUGINS` | ✅ | Keeps plugin auto-update on when the main auto-updater is off. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. Checked first in the plugin auto-update skip check | All sessions. Not set from project `env` before trust |
| `MCP_CONNECTION_NONBLOCKING` | ✅ | Controls whether startup waits for MCP servers before the first query. | - | - |
| `MCP_CONNECT_TIMEOUT_MS` | ✅ | Sets how long blocking MCP startup waits for the connection batch. | A number of milliseconds | - |
| `MCP_DISCOVERY_CACHE` | ✅🧪 | Turns the MCP discovery cache on with `1` or off with `0`. | - | - |
| `MCP_DISCOVERY_CACHE_MAX_STALE_S` | ✅ | Sets the maximum age of a discovery-cache entry in seconds. | - | - |
| `MCP_DISCOVERY_CACHE_STRIKES` | ✅ | Sets how many failed background refreshes in a row discard a cache entry. | - | - |
| `MCP_DISCOVERY_CACHE_TTL_S` | ✅ | Sets how long a cache entry is used without a background refresh. | - | - |
| `MCP_PROTOCOL_NEGOTIATION` | ✅ | Chooses whether the v2 MCP client probes servers for the newer protocol revision. | - | - |
| `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` | ✅ | Sets how many remote (HTTP or SSE) MCP servers connect in parallel at startup. | A number | - |
| `MCP_SDK_GENERATION` | ✅ | Pins the MCP client runtime to `v1` or `v2`. | - | - |
| `MCP_SERVER_CONNECTION_BATCH_SIZE` | ✅ | Sets how many local (stdio) MCP servers connect in parallel at startup. | A number | - |
| `MCP_TIMEOUT` | ✅ | Sets the startup connect timeout of one MCP server in milliseconds. | - | - |
| `MCP_TOOL_TIMEOUT` | ✅ | Sets the timeout of an MCP tool call in milliseconds. | - | - |
| `MCP_TRUNCATION_PROMPT_OVERRIDE` | 🔍 | Chooses the prompt for large MCP output saved to a file. Any value except `legacy` picks the new prompt. | - | - |

## See Also

- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
