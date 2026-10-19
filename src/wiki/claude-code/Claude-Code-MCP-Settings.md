# Claude Code MCP Settings

These settings decide which MCP servers may run and which ones a project may use.
Administrators use them for allow lists and deny lists.
For example, `{ "enableAllProjectMcpServers": true }` approves each server in a project `.mcp.json` file.
The marks are explained on [MCP](Claude-Code-MCP).

## Settings Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `enableAllProjectMcpServers` | Approves all `.mcp.json` servers | Boolean. Ignored in an untrusted folder when it comes from the checked-in `.claude/settings.json` | Settings files | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `enabledMcpjsonServers` | Approved `.mcp.json` servers | Array of names. Same trust rule as above | Settings files | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disabledMcpjsonServers` | Rejected `.mcp.json` servers | Array of names. It blocks in every permission mode and in every folder | Settings files | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `managedMcpServers` | Servers the organization gives to every user | Object keyed by name. Only `http` and `sse`. No `command`, `args`, `env`, `headersHelper`, no `${VAR}`, `https://` URL only. Users cannot remove them. `deniedMcpServers` still applies. | Managed settings only | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `allowedMcpServers` | Allowlist of servers users may use | Array of entries. Each entry has exactly one of `serverName`, `serverCommand` (exact array), `serverUrl` (wildcard pattern such as `https://*.example.com/*`). Undefined allows all. | Settings, mainly managed | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `deniedMcpServers` | Denylist of servers | Same entry shapes. It applies in all scopes, also for the organization | Settings, mainly managed | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `allowManagedMcpServersOnly` | Reads the allowlist from managed settings only | `deniedMcpServers` still merges from all sources. Users can still add servers, but only the admin allowlist applies | Managed settings only | [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `allowAllClaudeAiMcps` | Lets connectors load beside `managed-mcp.json` | Default off keeps the lockdown | Managed settings only | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `allowClaudeInChromeWithManagedMcp` | Lets Claude in Chrome run beside `managed-mcp.json` | Device managed settings only. `deniedMcpServers` and the org Chrome setting still block it | Device managed settings | [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableClaudeAiConnectors` | Turns off the connectors Claude Code fetches | `true` in any source wins. It also stops a `claudeai-proxy` server from `--mcp-config` | Any settings scope | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `channelsEnabled` | Org opt-in for channel notifications | Teams and Enterprise: default off. Console: default on unless managed settings exist | Managed settings | [Channels Reference](https://code.claude.com/docs/en/channels-reference), [Push Events into a Running Session with Channels](https://code.claude.com/docs/en/channels) |
| ✅ | `allowedChannelPlugins` | Org allowlist of channel plugins | Replaces the default Anthropic allowlist. Needs `channelsEnabled: true` | Managed settings | [Channels Reference](https://code.claude.com/docs/en/channels-reference), [Push Events into a Running Session with Channels](https://code.claude.com/docs/en/channels) |
| 🔍 | `xaaIdp` | IdP connection for XAA | Object `{ issuer, clientId, callbackPort? }`. Written by `claude mcp xaa setup` | User settings | Schema: `xaaIdp`. See [Claude Code MCP Auth](Claude-Code-MCP-Auth) |

## State Keys in `~/.claude.json`

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `disabledMcpServers` | Per-project opt-out list | Covers user, plugin, managed, connector, and default-on built-in servers. A connector uses its display name, such as `claude.ai Slack` | `projects["<path>"]` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `enabledMcpServers` | Per-project opt-in list | Only for built-in servers that default to off, such as `computer-use`. Other entries are ignored | `projects["<path>"]` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `hasTrustDialogAccepted` | Workspace trust flag | `true` lets a `headersHelper` of a project or local server run without the dialog | `projects["<path>"]` | - |

## Files

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `.mcp.json` | Project servers | Project root. Needs approval in interactive sessions. `claude -p`, SDK, and cloud sessions load it without a prompt | Project | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `~/.claude.json` | Local and user servers | Written by `claude mcp add` | User | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `managed-mcp.json` | Fixed server set from the organization | It gives the organization exclusive control. Claude Code warns and ignores other sources. Claude in Chrome and connectors are blocked unless the two `allow` keys above are set | Managed | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `--mcp-config <configs...>` | Loads servers from files or strings | Space-separated. Scope `dynamic`. `headersHelper` runs in the primary working directory | Launch flag | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `--strict-mcp-config` | Uses only `--mcp-config` servers | Skips the approval prompt for project servers that it does not load (`2.1.246` and later) | Launch flag | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| 🔍 | `--plugin-dir-no-mcp <path>` | Loads an inline plugin without its MCP servers | Hidden flag. The SDK form is `skipMcpDiscovery` | Launch flag | Bundle: flag list |
| ✅ | `--channels <servers...>` | Registers channel notifications of listed servers | Hidden flag. Space-separated names. See [Claude Code MCP Runtime](Claude-Code-MCP-Runtime) | Launch flag | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Channels Reference](https://code.claude.com/docs/en/channels-reference) |
| ✅ | `--dangerously-load-development-channels <servers...>` | Loads channel servers not on the allowlist | Hidden flag. For local channel development. Shows a confirmation dialog | Launch flag | [Channels Reference](https://code.claude.com/docs/en/channels-reference), [Push Events into a Running Session with Channels](https://code.claude.com/docs/en/channels) |
| ✅ | `--setting-sources` | Excludes project settings | Keeps a project `.mcp.json` out | Launch flag | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## Approval Rules

- `claude mcp list` and `claude mcp get` read approvals only from files that are not in the repository until you trust the folder.
- These sources apply in an untrusted folder: `~/.claude/settings.json`, managed settings, and `--settings`.
- An untracked `.claude/settings.local.json` applies only in a trusted folder (before `2.1.207` it applied always).
- Claude Code also skips the project prompt in `bypassPermissions` mode when `skipDangerousModePermissionPrompt` is set in user or managed settings.

## See Also

- [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) is the guide for administrators.
- [Settings: MCP and Channels](Claude-Code-Settings-MCP-And-Channels) lists the keys with their types.
