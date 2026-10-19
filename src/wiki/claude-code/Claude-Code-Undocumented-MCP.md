# Claude Code Undocumented MCP

MCP lets Claude Code use tools from other programs.
Some MCP settings and messages are not in the official docs.
Of its 29 rows, 21 is found only in the program, and 8 work only behind a flag or a gate.
Anthropic can change or remove each item in any release.

## Found Only in the Program

21 items are in the program but not in the official docs.
These are the most useful ones.

- `ReadMcpResourceDirTool`: Lists children of a directory resource. See [MCP Runtime](Claude-Code-MCP-Runtime).
- `bareElicitationCapability`: Declare a bare `elicitation` capability. See [MCP Config](Claude-Code-MCP-Config).
- `ws-ide`: Server of an IDE extension over WebSocket. See [MCP](Claude-Code-MCP).
- `claudeai-proxy`: A claude.ai connector through the MCP proxy. See [MCP](Claude-Code-MCP).
- `discoveryCache`: Per-server switch of the discovery cache. See [MCP Config](Claude-Code-MCP-Config).
- `sse-ide`: Server of an IDE extension over SSE. See [MCP](Claude-Code-MCP).
- `request_timeout_ms`: Wire hint for a per-request timeout. See [MCP Config](Claude-Code-MCP-Config).
- `--plugin-dir-no-mcp <path>`: Loads an inline plugin without its MCP servers. See [MCP Settings](Claude-Code-MCP-Settings).
- `enterprise`, `agent`: Other scope names in the bundle list. See [MCP](Claude-Code-MCP).

## Behind a Flag or a Gate

8 items work only when a flag or a gate is on.
These are some of them.

- `claude mcp xaa setup`: Sets the IdP connection for XAA. See [MCP CLI](Claude-Code-MCP-CLI).
- XAA (SEP-990): Signs in through an enterprise IdP. See [MCP Auth](Claude-Code-MCP-Auth).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [MCP](Claude-Code-MCP) | 5 |
| [MCP Auth](Claude-Code-MCP-Auth) | 6 |
| [MCP CLI](Claude-Code-MCP-CLI) | 3 |
| [MCP Config](Claude-Code-MCP-Config) | 8 |
| [MCP Runtime](Claude-Code-MCP-Runtime) | 5 |
| [MCP Settings](Claude-Code-MCP-Settings) | 2 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
