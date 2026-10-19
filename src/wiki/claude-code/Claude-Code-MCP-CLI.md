# Claude Code MCP CLI

The `claude mcp` command adds, lists, and removes MCP servers from the shell.
Inside a session, the `/mcp` command shows the state of each server.
For example, `claude mcp list` prints each server and tells you if it is connected.
The marks are explained on [MCP](Claude-Code-MCP).

## Subcommands

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `claude mcp add [options] <name> <commandOrUrl> [args...]` | Adds a server | Writes to the scope. Prints `Added ...`. Use `--` before a stdio command so that its flags are not parsed. Rejects a reserved name | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `claude mcp add-json [options] <name> <json>` | Adds a server from a JSON string | Accepts `stdio`, `sse`, `http`, `ws`. The JSON is the entry object, not the `mcpServers` wrapper | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `claude mcp add-from-claude-desktop [options]` | Imports servers from Claude Desktop | macOS and WSL only. Interactive pick. A name with other characters is rejected. A duplicate gets a suffix such as `server_1` | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `claude mcp get <name>` | Shows one server | Health-checks approved servers. Shows `Issue:` for a failure. Unapproved `.mcp.json` servers show `Pending approval`. A plugin stdio server shows `Command: stdio` and `NAME=[REDACTED]` | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `claude mcp list` | Lists servers | Health status per server: `Connected`, `Needs authentication`, `Failed to connect`, `Pending approval`, `Disabled for this project`. Warnings are shown here | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `claude mcp remove [options] <name>` | Removes a server | Without `--scope` it removes from the scope where it exists. It deletes stored OAuth tokens and client registration of a remote server | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `claude mcp login [options] <name>` | Runs OAuth for a server | Works for `http`, `sse`, and claude.ai connectors. Without a local browser it prints the URL and asks for the redirect URL | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `claude mcp logout <name>` | Clears stored OAuth credentials | Does not remove the server | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [CLI Reference](https://code.claude.com/docs/en/cli-reference) |
| ✅ | `claude mcp reset-project-choices` | Resets approvals | Clears all approved and rejected `.mcp.json` servers for this project | Shell | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `claude mcp serve [options]` | Runs Claude Code as an MCP server | Stdio. It prints nothing at start. It exposes the Claude Code tools to the client, and the client must ask for confirmation | Shell, other MCP clients | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| 🧪 | `claude mcp xaa setup` | Sets the IdP connection for XAA | Options `--issuer <url>`, `--client-id <id>`, `--client-secret`, `--callback-port <port>`. Writes `xaaIdp`. The secret comes from `MCP_XAA_IDP_CLIENT_SECRET`. Gate: `CLAUDE_CODE_ENABLE_XAA` | Shell | Bundle: `command("xaa")` |
| 🧪 | `claude mcp xaa login` | Caches an IdP `id_token` | Runs the OIDC browser login. Options `--force` and `--id-token <jwt>` (writes a ready JWT, for tests). Gate: `CLAUDE_CODE_ENABLE_XAA` | Shell | Bundle: `command("xaa")` |

## Flags

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `-s, --scope <scope>` | Picks the scope | `local` (default), `user`, `project`. On `remove` the default is the scope where the server exists | `add`, `add-json`, `add-from-claude-desktop`, `remove` | - |
| ✅ | `-t, --transport <transport>` | Picks the transport | `stdio` (default), `sse`, `http`. `ws` is not accepted | `add` | `mcp-add.txt`. MCP docs, Option 4 |
| ✅ | `-e, --env <env...>` | Sets env vars of a stdio server | `KEY=value`. Put another option between `--env` and the name | `add` | `mcp-add.txt`. MCP docs, Option 3 |
| ✅ | `-H, --header <header...>` | Sets headers of a remote server | `"Name: value"` | `add` | `mcp-add.txt` |
| ✅ | `--client-id <clientId>` | OAuth client ID | Only for `http` and `sse` | `add` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `--client-secret` | Prompts for the OAuth client secret | Masked input. `MCP_CLIENT_SECRET` skips the prompt. Stored in the keychain (macOS) or a credentials file. Set only when you add the server | `add`, `add-json` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `--callback-port <port>` | Fixed OAuth callback port | For servers with a pre-registered `http://localhost:PORT/callback`. Must be an integer from 1 to 65535 for `xaa setup` | `add` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| 🧪 | `--xaa` | Enables XAA for the server | Hidden unless `CLAUDE_CODE_ENABLE_XAA` is set. Needs `xaa setup`, `--client-id`, and `--client-secret`. Without the env var Claude Code prints `--xaa requires CLAUDE_CODE_ENABLE_XAA=1` | `add` | Bundle: `--xaa` option |
| ✅ | `--no-browser` | Prints the authorization URL | For SSH and headless sessions. You paste the redirect URL back | `login` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [CLI Reference](https://code.claude.com/docs/en/cli-reference) |
| ✅ | `-d, --debug`, `--verbose` | Debug output and verbose override | - | `serve` | `mcp-serve.txt` |

## The `/mcp` Command

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `/mcp` | Opens the MCP panel | Shows status, tool count, `cached` state, and `Issue:`. You can enable, disable, reconnect, authenticate, and clear authentication | Interactive session | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `/mcp reconnect all` | Retries every failed server | Interactive terminal needs `2.1.284` or later | Interactive session | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `/mcp enable\|disable\|reconnect <server>` | Steers a server without the panel | The bundle suggests it when no terminal is attached to a background session | Background session | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | `/mcp__<server>__<prompt>` | Runs an MCP prompt | See [Claude Code MCP Runtime](Claude-Code-MCP-Runtime) | Interactive session | MCP docs, Use MCP prompts as commands |

## See Also

- [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) is the docs page.
- [CLI](Claude-Code-CLI) lists the other subcommands and flags.
