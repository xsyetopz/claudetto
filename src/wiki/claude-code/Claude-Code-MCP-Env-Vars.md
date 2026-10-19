# Claude Code MCP Env Vars

These env vars change how Claude Code starts, times out, and limits MCP servers.
Set them in the shell or in the `env` key of the settings file.
For example, `MCP_TIMEOUT=30000` gives a server 30 seconds to start.
The marks are explained on [MCP](Claude-Code-MCP).

## Documented Variables

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `MCP_TIMEOUT` | Startup timeout of one server | Milliseconds. Default 30000 | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_TOOL_TIMEOUT` | Timeout of one tool call | Milliseconds. Default 100000000 (about 28 hours). Values below 1000 become 1 s. The per-server `timeout` wins. Remote servers also have a 60 s per-request timer | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` | Idle timeout of a call | Milliseconds. Defaults 300000 (remote) and 1800000 (stdio). `0` turns it off | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_CONNECT_TIMEOUT_MS` | Wait of blocking startup | Milliseconds. Default 5000. Applies with `MCP_CONNECTION_NONBLOCKING=0` or `alwaysLoad` | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_CONNECTION_NONBLOCKING` | Startup wait | Startup does not wait by default. `0` waits for servers before the first query. `alwaysLoad` servers still wait | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_SERVER_CONNECTION_BATCH_SIZE` | Parallel local connects | Default 3 (stdio) | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` | Parallel remote connects | Default 20 (`http`, `sse`) | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_MCP_STARTUP_WAIT_MS` | First-turn wait in non-interactive mode | Milliseconds. `0` skips the wait. `2.1.274` and later | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MAX_MCP_OUTPUT_TOKENS` | Token limit of a result | Default 25000. Warning at 10000 is fixed | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` | Length limit of descriptions and instructions | Replaces both defaults (4096 and 16384). `2.1.280` and later | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` | Auto background delay | Default 120000. `0` turns it off. `2.1.212` and later | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Turns off all background tasks | `1` also turns off MCP auto background | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_AUTO_BACKGROUND_TASKS` | Allows auto background in `-p` | `1` | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_MCP_ALLOWLIST_ENV` | Minimal env for stdio servers | `1` gives only a safe baseline plus the server `env` | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `ENABLE_TOOL_SEARCH` | Tool search mode | Unset, `true`, `auto`, `auto:N`, `false`. See [Claude Code MCP Runtime](Claude-Code-MCP-Runtime) | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Strips beta fields | Keeps tool search off. Managed settings can keep it on (`2.1.227` and later) | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `ENABLE_CLAUDEAI_MCP_SERVERS` | Fetch of connectors | `false` stops the fetch | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `MCP_DISCOVERY_CACHE` | Discovery cache switch | `1` on, `0` off. Off by default unless a rollout enables it | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_DISCOVERY_CACHE_TTL_S` | Entry age without refresh | Default 900 | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_DISCOVERY_CACHE_MAX_STALE_S` | Max entry age | Default 14400, capped at 7 days | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_DISCOVERY_CACHE_STRIKES` | Failed refreshes before discard | Default 1 | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_SDK_GENERATION` | Pins the client runtime | `v1` or `v2`. Read once per process. `2.1.218` and later | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_PROTOCOL_NEGOTIATION` | Probes for revision 2026-07-28 | `auto` or `legacy`. v2 runtime only | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_CLIENT_SECRET` | OAuth client secret | Skips the prompt of `--client-secret` | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `MCP_OAUTH_CALLBACK_PORT` | Fixed OAuth callback port | Same as `--callback-port` | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | Drops the name prefix | `1` skips `mcp__<server>__` for SDK servers | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_PROJECT_DIR` | Project root for a server | Claude Code sets it in a stdio server env | Server env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `CLAUDE_CODE_SESSION_ID`, `CLAUDECODE` | Set for stdio servers | The session ID stays as at spawn | Server env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | Strips credentials | Also for stdio servers | Env | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_MCP_SERVER_NAME`, `CLAUDE_CODE_MCP_SERVER_URL` | Tell a `headersHelper` the server | Set for the helper only | Helper env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |

## Undocumented Variables

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| 🔍 | `ENABLE_MCP_LARGE_OUTPUT_FILES` | Switch for result files | `false` truncates instead of saving a file | Env | Bundle: large-result handler |
| 🔍 | `CLAUDE_CODE_MCP_APPS_HOST` | Declares MCP Apps support | `true` adds the `io.modelcontextprotocol/ui` extension to the client capabilities | Env | Bundle: capability builder |
| 🔍 | `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | Skips plugin servers | The log says `(CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS is set)` | Env | Bundle: log strings |
| 🔍 | `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT` | Exempts plugin servers | The log says `exempted via`. | Env | Bundle: log strings |
| 🔍 | `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS` | Adds a refresh tool | Adds one more tool to the tool list when set. | Env | Bundle: tool list builder |
| 🔍 | `MCP_TRUNCATION_PROMPT_OVERRIDE` | Picks the truncation prompt | `legacy` selects the old prompt. Any other value selects the new one. Unset follows a flag | Env | Bundle |
| 🔍 | `MCP_OAUTH_CLIENT_METADATA_URL` | Overrides the CIMD URL | Used as the OAuth client metadata URL | Env | Bundle: OAuth client code |
| 🔍 | `CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS` | Timeout of plugin MCP sync | Default 10000 ms | Env | Bundle: plugin sync code |
| ✅ | `CLAUDE_CODE_REMOTE_MCP_CONFIG` | Path of the delivered server file | Read in remote sessions as a copy of `--mcp-config` with scope `dynamic` | Env | - |
| 🔍 | `CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS` | First-turn wait for connectors | Used with an `sdkUrl` session. Capped at 2147483647 | Env | Bundle: first-turn wait code |
| 🔍 | `CLAUDE_CODE_MCP_PREWAIT_SERVERS`, `CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS` | Named servers to wait for | Read for a CCR worker. | Env | Bundle: first-turn wait code |
| 🔍 | `CLAUDE_CODE_MCP_MEMORY_CGROUP` | Memory cap class of MCP processes | Linked to the Linux tool memory cap. `none` is accepted. | Env | Bundle: cgroup code |
| 🔍 | `CLAUDE_CODE_TERMINAL_MCP_TOOLS` | List of MCP tool names | Comma-separated. A turn that ends with these tool results is checked. | Env | Bundle: reader function |
| 🔍 | `CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS` | Stops SDK manifest capture | Sets `captureSdkMcpManifests` to false | Env | Bundle: SDK init |
| 🔍 | `CLAUDE_CODE_BRIDGE_MCP_CARRIER` | Marks a bridge MCP carrier | `1` means child. Another value means descendant. | Env | Bundle: reader function |
| 🧪 | `CLAUDE_CODE_ENABLE_XAA` | Turns XAA on | `1`. See [Claude Code MCP Auth](Claude-Code-MCP-Auth) | Env | Bundle: gate function |
| 🧪 | `MCP_XAA_IDP_CLIENT_SECRET` | IdP client secret for XAA | Read by `claude mcp xaa setup --client-secret` | Env | Bundle: `xaa setup` |
| 🔍 | `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND` | Env name found in the bundle | Listed in env lists. | Env | Bundle: env name |
| 🔍 | `CLAUDE_CODE_MCP_ALWAYS_LOAD_JOIN_BEFORE_INPUT` | Env name found in the bundle | Listed in env lists. | Env | Bundle: env name |
| 🔍 | `CLAUDE_CODE_CHROME_MCP_ORG_DENIED` | Env name found in the bundle | Listed in a subprocess env list. | Env | Bundle: env name |
| 🔍 | `ALLOW_ANT_COMPUTER_USE_MCP` | Env name found in the bundle | Effect unknown | Env | Bundle: env name |

## See Also

- [Env Vars](Claude-Code-Env-Vars) lists every env var.
- [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) is the docs page.
