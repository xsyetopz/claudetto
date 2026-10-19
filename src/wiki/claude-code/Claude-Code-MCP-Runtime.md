# Claude Code MCP Runtime

After an MCP server connects, Claude Code adds its tools, resources, and prompts to the session.
The names, the permission rules, and the limits decide what Claude can use and for how long.
A tool from a server is named `mcp__<server>__<tool>`.
For example, `mcp__github__create_issue` is the `create_issue` tool of the `github` server.
The marks are explained on [MCP](Claude-Code-MCP).

## Tools and Names

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `mcp__<server>__<tool>` | Name of an MCP tool | Characters outside `A-Z a-z 0-9 _ -` in the server name become `_`. A tool with a full name over 128 characters is left out | Permission rules, hooks, `tools`, `allowed-tools` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `mcp__plugin_<plugin>_<server>__<tool>` | Name of a plugin server tool | Hook matchers on the bare server key never fire for it. The server is named `plugin:<plugin>:<server>` | Same | - |
| ✅ | Patterns `mcp__github`, `mcp__github__*`, `mcp__*` | Select tools by server | `mcp__github` and `mcp__github__*` match one server. `mcp__*` matches all MCP tools | Subagent `tools` and `disallowedTools` | - |
| ✅ | Hook matcher `mcp__memory__.*` | Matches a server in hooks | A matcher with only exact-match characters, such as `mcp__memory`, matches no tool. The `.*` is required | `PreToolUse`, `PostToolUse` and others | - |
| ✅ | `mcp_server` hook input field | Gives the origin of the server | Object with `name` and `source` (`plugin`, `sdk`, `user`, `project`, ...) | Tool hooks | - |
| ✅ | `mcp_tool` hook type | Calls an MCP tool as a hook | Output is treated as command stdout. Skipped on `Setup` and at `SessionStart` before servers connect | Hooks | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `updatedMCPToolOutput` | Replaces an MCP tool result | PostToolUse hook output, MCP tools only | `PostToolUse` | - |
| ✅ | `ToolSearch` | Finds deferred MCP tools | On by default. `permissions.deny: ["ToolSearch"]` turns the tool off | Main session | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `WaitForMcpServers` | Waits for a connecting server | Used when tool search is off. With tool search the wait is inside `ToolSearch` | Main session, subagents | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| 🔍 | `SearchMcpRegistry`, `SuggestConnectors`, `ListConnectors` | Find and list MCP connectors | `SearchMcpRegistry` searches the connector registry by keyword. `ListConnectors` lists the connectors of the claude.ai org. | Main session | Bundle: tool descriptions |

## Resources and Prompts

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `@server:protocol://path` | Attaches a resource | Fetched as an attachment. Fuzzy search in the `@` menu | Prompt input | MCP docs, Reference MCP resources |
| ✅ | `ListMcpResourcesTool` | Lists resources of all servers | The docs say Claude Code provides tools to list and read resources but give no names. Each entry has a `server` field. `ui://` entries are hidden | Model | - |
| ✅ | `ReadMcpResourceTool` | Reads one resource | Parameters `server` and `uri` (both required) | Model | - |
| 🔍 | `ReadMcpResourceDirTool` | Lists children of a directory resource | Parameters `server` and `uri`. Uses `resources/directory/read`. Not recursive. Only for a server that declares directory support | Model | Bundle: tool text |
| 🔍 | Old tool names | Maps old names to new | `ListMcpResources`, `ReadMcpResource`, `ReadMcpResourceDir` map to the `...Tool` names | Rules, hooks | Bundle: alias map |
| ✅ | `/server:prompt (MCP)` and `/mcp__server__prompt args` | Runs a server prompt | Arguments split on whitespace. Results go into the conversation. Needs the prompt capability | Slash menu | MCP docs, Execute MCP prompts |
| ✅ | MCP Apps resources | UI pages for a host | `ui://` URI or media type `text/html` with the profile parameter `mcp-app`. Reading by URI still works | Resources | MCP docs, Use MCP resources |
| 🔍 | `CLAUDE_CODE_MCP_APPS_HOST` | Declares MCP Apps support | Adds the extension `io.modelcontextprotocol/ui` with the MIME type to the client capabilities | Env | Bundle: capability builder |

## Elicitation and Channels

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Elicitation dialog | Asks you for input | `form` mode shows fields. `url` mode asks to open a link. The escaped URL has a cap (about 8000 characters). Declared `elicitation: {form: {}, url: {}}` | Interactive session | MCP docs, Respond to MCP elicitation requests |
| ✅ | `Elicitation` hook | Answers a request | Input: `mcp_server_name`, `message`, `mode`, `url`, `elicitation_id`, `requested_schema`. Output action: `accept` (with `content`), `decline`, `cancel` | Hooks | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `ElicitationResult` hook | Observes or overrides the answer | Input has `action` and `content`. Runs before the answer goes to the server | Hooks | - |
| ✅ | `claude/channel` capability | Lets a server push messages | You opt in with `--channels`. Not registered on a v2 connection that negotiated revision 2026-07-28 | Servers | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Channels Reference](https://code.claude.com/docs/en/channels-reference) |
| ✅ | `claude/channel/permission` | Channel permission relay | Notifications `notifications/claude/channel/permission_request` and `.../permission`. | Channel servers | [Channels Reference](https://code.claude.com/docs/en/channels-reference) |
| ✅ | `channels` plugin key | Binds a channel to a plugin server | Fields `server`, `displayName`, `userConfig` | `plugin.json` | - |

## Limits

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Output warning | Warns on large output | Fixed at 10000 tokens | MCP tool results | MCP docs, MCP output limits |
| ✅ | `MAX_MCP_OUTPUT_TOKENS` | Token limit of a result | Default 25000. Over the limit, Claude Code saves the result to a file in `tool-results` and shows the path. Images stay under this limit | MCP tool results | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | 50000 characters | File threshold for text | A successful text result over 50000 characters is saved to a file, whatever the token count | MCP tool results | MCP docs, MCP output limits |
| 🔍 | `ENABLE_MCP_LARGE_OUTPUT_FILES` | Switch for the file path | When `false`, Claude Code truncates instead of saving to a file | Env | Bundle: large-result handler |
| ✅ | `_meta["anthropic/maxResultSizeChars"]` | Raises the threshold for one tool | Up to 500000 characters. Text only | `tools/list` entry | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `_meta["anthropic/requiresUserInteraction"]` | Always asks | Only JSON `true` counts. Prompt in all modes. `dontAsk` denies. `--permission-prompt-tool` allow becomes deny | `tools/list` entry | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `_meta["anthropic/alwaysLoad"]` | Loads a tool upfront | `false` keeps it deferred when the user config sets `alwaysLoad: true` (`2.1.285` and later) | `tools/list` entry | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | Error text | Shortens long errors | Over about 11000 characters, the first 5000 and last 5000 stay | `isError: true` results | MCP docs, MCP output limits |
| ✅ | 16 MiB response | Cap of one response or message | HTTP and SSE stop reading. A WebSocket closes the connection | Remote servers | MCP docs, MCP output limits |
| ✅ | Description limits | Cuts long text | 4096 characters for server instructions and an upfront tool. 16384 for a tool found by tool search. `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` replaces both | Tool search | MCP docs, Tool search for MCP server authors |
| ✅ | Schema checks | Drops bad tools | Excludes a tool with a bad top-level property name or an invalid 2020-12 schema. Flattens a root `anyOf`, `oneOf`, `allOf` | Tool load | MCP docs, Tools with invalid input schemas |

## Timing and Recovery

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Auto background | Moves a long call to a task | After 120000 ms in the main conversation. Not for subagents, IDE servers, or `-p` unless `CLAUDE_AUTO_BACKGROUND_TASKS=1` | Main session | MCP docs, Automatic backgrounding |
| ✅ | Idle timeout | Aborts a silent call | 5 minutes for remote servers, 30 minutes for stdio. `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` changes it. `0` turns it off | All but IDE and `sdk` | MCP docs, Tips |
| ✅ | Reconnection | Retries a dropped remote server | Five tries with backoff from 1 s. Stdio is not reconnected. First connect retries 3 times except `ws` and auth errors | Remote servers | MCP docs, Automatic reconnection |
| ✅ | `list_changed` | Refreshes tools, prompts, resources | Interactive sessions refresh all three. `-p` refreshes tools only. A failed refresh keeps the old lists | Connected servers | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | Stdio shutdown | Stops a stdio server | macOS and Linux: `SIGINT`, `SIGTERM` after 100 ms, `SIGKILL` after 400 ms more | Stdio servers | MCP docs, How Claude Code stops a stdio server |
| ✅ | `roots/list` | Gives allowed directories | Answers with the launch directory and added directories | Servers | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | Tool search modes | Controls deferral | `ENABLE_TOOL_SEARCH`: unset, `true`, `auto`, `auto:N`, `false` | Env | MCP docs, Configure tool search |

## See Also

- [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) is the docs page.
- [Tools](Claude-Code-Tools) explains tool search and deferral.
