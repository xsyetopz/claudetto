# Claude Code MCP Config

An MCP server is a program that gives Claude new tools.
You write its config in `.mcp.json` or in `~/.claude.json`, and each transport takes its own options.
Each transport takes its own options, and values can use `${VAR}` expansion.
For example, `{ "mcpServers": { "files": { "command": "npx", "args": ["server"] } } }` starts a local server.
The marks are explained on [MCP](Claude-Code-MCP).

## File Shape

`.mcp.json` holds one object, `mcpServers`, that maps a server name to an entry.
The bundle schema is `{ mcpServers: Record<string, ServerConfig> }`.
`~/.claude.json` uses the same entry shape under `mcpServers` (user scope) and under `projects["<path>"].mcpServers` (local scope).
A plugin can use the same shape in its `.mcp.json` or inline in `plugin.json`.

```json
{
  "mcpServers": {
    "name": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

## Server Options

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `type` | Picks the transport | `stdio`, `sse`, `http`, `ws`. `streamable-http` is an alias of `http`. No `type` means `stdio`, so a `url` without `type` is an error and Claude Code skips it | All entries | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `command` | Program to run | Required, at least one character. `${VAR}` is expanded | `stdio` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `args` | Arguments | Array of strings. Default `[]`. `${VAR}` is expanded | `stdio` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `env` | Env vars for the process | Map of strings. `${VAR}` is expanded | `stdio` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `url` | Endpoint | `${VAR}` is expanded. An empty `url` shows as `not configured` and is not connected | `http`, `sse`, `ws` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `headers` | Static request headers | Map of strings. `${VAR}` is expanded. Credential variables read as empty here | `http`, `sse`, `ws` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `headersHelper` | Command that prints headers | Runs in a shell on each connect. Output is a JSON object. See [Claude Code MCP Auth](Claude-Code-MCP-Auth) | `http`, `sse`, `ws` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `oauth` | OAuth client settings | Object with `clientId`, `callbackPort`, `authServerMetadataUrl`, `scopes`. See [Claude Code MCP Auth](Claude-Code-MCP-Auth) | `http`, `sse` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `timeout` | Wall-clock limit of one tool call, in ms | Positive integer. A value below 1000 is ignored. It overrides `MCP_TOOL_TIMEOUT` for this server. It is a floor for the idle timeout | All types | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `alwaysLoad` | Skip tool search deferral | `true` loads all tools upfront and makes startup wait for the server (5 s cap). `false` defers all tools, also those marked by the author (`2.1.287` and later) | All types | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| 🔍 | `bareElicitationCapability` | Declare a bare `elicitation` capability | When `true`, Claude Code sends `elicitation: {}` instead of the form and url capability | `stdio`, `sse`, `http`, `ws` | Bundle: server schema and the capability selector |
| 🔍 | `discoveryCache` | Per-server switch of the discovery cache | Boolean. Claude Code removes it from the shown config | `sse`, `http` | Bundle: server schema |
| ✅ | `role` | Coordinator-mode role | Only `"comms"`. It marks the server that the coordinator uses to address the user. | `stdio`, `sse`, `http`, `ws`, IDE types | - |
| 🔍 | `request_timeout_ms` | Wire hint for a per-request timeout | Folded into `timeout` at parse when `timeout` is absent, capped at 300000. | `sse`, `http` | Bundle: the key `request_timeout_ms` |
| 🔍 | `toolPermissions` | Per-tool policy map | Tool name to `allow`, `ask`, or `blocked`. `ask` prompts on each call and `blocked` hides the tool | `sse`, `http`, `claudeai-proxy` | Bundle: server schema. MCP docs, Organization controls |
| ✅ | `tools` | Per-tool policy list | Array of `{ name, permission_policy }`. The policy is `always_allow`, `always_ask`, or `always_deny`. Set by a host with `mcp_set_servers` | `sse`, `http`, `sdk` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Channels Reference](https://code.claude.com/docs/en/channels-reference) |
| 🔍 | `disableAutoBackground` | Never auto-background calls | `true` keeps the call in the foreground. Read when the server is first registered. | `sdk` | Bundle: `disableAutoBackground` description |
| ✅ | `name` | Name of the in-process server | String | `sdk` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `ideName`, `ideRunningInWindows`, `authToken` | Data of an IDE server | `authToken` exists only on `ws-ide` | `sse-ide`, `ws-ide` | Bundle: server schema |
| ✅ | `id`, `displayName`, `iconUrl`, `stateless`, `enterpriseManaged` | Data of a connector | `id` must match `[A-Za-z0-9_-]+`. Others describe the connector row in `/mcp` | `claudeai-proxy` | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `cachedInitResponse`, `cachedDiscoverResponse`, `discoverSupport`, `eligible`, `ineligibleReason` | Cached connector data | `discoverSupport` is `supported`, `legacy`, or `unknown`. Claude Code removes these from the shown config | `claudeai-proxy` | Bundle: server schema |

## Env Var Expansion

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `${VAR}` | Value of an env var | An unset var without a default keeps the `${VAR}` text and shows a warning in `claude mcp list` and `/mcp` | `command`, `args`, `env`, `url`, `headers` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `${VAR:-default}` | Value or default | Uses `default` when `VAR` is unset | Same fields | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | Credential names read as empty | Protects your credentials | In a remote `url` and `headers`, names such as `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `AWS_BEARER_TOKEN_BEDROCK`, `HTTPS_PROXY`, `NPM_TOKEN` read as empty. A default is ignored. | Remote `url`, `headers` | MCP docs, Credential variables that read as empty |
| ✅ | `${CLAUDE_PROJECT_DIR}` | Project root | In `.mcp.json` and `~/.claude.json` use `${CLAUDE_PROJECT_DIR:-.}`. A plugin config substitutes it directly | `command`, `args` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` | Plugin paths | Replaced in `command`, `args`, `env` (`stdio`) and `url`, `headers`, `headersHelper` (remote) | Plugin servers | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `${user_config.KEY}` | Plugin option value | Allowed in `env` and `headers`. Not in `headersHelper` (shell command) | Plugin servers | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | Hidden whitespace warning | Detects pasted newlines | Checks `command`, `url`, each `args` entry, values and key names of `env` and `headers`. Values stay unchanged | All entries | MCP docs, Configuration warnings |

## Names

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Server name rule | Limits the name | Letters, numbers, hyphens, underscores | `claude mcp add`, `.mcp.json` | MCP docs, Import MCP servers from Claude Desktop |
| 🔍 | Blocked names | Rejects unsafe keys | The bundle also rejects `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__` | All scopes | Bundle: `server names may only contain` |
| ✅ | Reserved names | Built-in servers | `workspace`, `claude-in-chrome`, `computer-use`, `Claude Preview`, `Claude Browser`. Claude Code skips such a server and warns | All scopes | MCP docs, Configuration warnings |
| ✅ | `anthropic-skills` | Reserved prompt source | Prompts of a server with this name are not listed. Its tools still work | All scopes | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |

## Precedence

- Claude Code uses the highest source for a name and does not merge fields (MCP docs, Scope hierarchy and precedence).
- The order is: managed, local, project, user, plugin, claude.ai connector.
- Scopes match by name.
  Plugins and connectors match by endpoint.
- Two URLs are the same endpoint when they differ only in scheme or host case, a default port, or a trailing slash.
- The same name with different endpoints in two scopes gives a warning.
  OAuth sign-ins are stored for each endpoint.

## See Also

- [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) is the docs page.
- [MCP CLI](Claude-Code-MCP-CLI) shows `claude mcp add` for the same config.
