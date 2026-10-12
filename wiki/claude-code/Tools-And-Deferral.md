# Tools and deferral

How Claude Code `2.1.296` loads its tools, which of them are deferred, and what dotclaude changes in their descriptions.

## What it does

Each request to the model carries a tool list.
A tool in the list has a name, a description, and an input schema.
Some tools send all three in every request.
A deferred tool sends only its name, and Claude loads its schema with `ToolSearch` when it needs the tool.

The tool part is one of the larger parts of a request.
In the captured start of a session, it is about half of the request tokens.

## Sources

- The `2.1.296` binary, through the extract in `external/cc-extract/2.1.296/`.
  The folder `tool/` holds the text of 25 built-in tools.
  Seven of them also have a `.full.txt` variant.
  The folder `listing/` holds the lists of agent types and skills.
  Its file `deferred_tools.txt` holds only the header of the deferred-tool notice, with no tool names.
- The dossier `external/dossier/cc-2.1.296/tools.md`.
  It reads the deferral flags and the list filter from the bundle.
  Some of its rows are marked "unverified".
- Two captured API requests of `2.1.296`, in `external/capture/vanilla/` and `external/capture/snippet/`.
  Both requests name the model `claude-sonnet-5-5`.
  The token counts come from the capture reports in the same folders.
- The official docs, at the [tools reference](https://code.claude.com/docs/en/tools-reference) and in the [MCP guide](https://code.claude.com/docs/en/mcp).
  The docs list tools, such as `PowerShell`, that the `2.1.296` extract does not have.
  This page does not use the docs for a fact about `2.1.296`.

## Built-in tools of 2.1.296

The captured vanilla request sends 11 tools with their full schema.
These are `Agent`, `Bash`, `Edit`, `ListAgents`, `Read`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, and `Write`.
The request also sends one placeholder, `DeferredToolPlaceholder`, which marks deferred loading.

The dossier marks these tools as deferred:

- `NotebookEdit`, `EnterPlanMode`, `ExitPlanMode`, `WebFetch`, and `WebSearch`.
- `TodoWrite` and the five task tools.
- `LSP`, `Monitor`, `EnterWorktree`, and `ExitWorktree`.
- `CronCreate`, `CronDelete`, and `CronList`, and `PushNotification` and `RemoteTrigger`.
- `SendMessage`, `SendFile`, `FetchInboxMessage`, `PublishPlugin`, `ProposeGoal`, and `DesignSync`.
- `EndConversation`, and the self-hosted runner tools.

The dossier says a tool is deferred when its `shouldDefer` flag is set, or when it is an MCP tool.
It removes a tool from the list when a permission deny rule names it.
A bare `permissions.deny` name therefore hides the tool.

The dossier does not settle these points:

- It marks `Glob` and `Grep` as loaded by default.
  Neither is in the captured vanilla request.
- Several rows of the dossier are "unverified", and they stay unverified here.
- The extract does not list the names of the deferred tools.
  The deferred set on this page therefore comes from the dossier, and not from a listing of the binary.

## How ToolSearch loads a schema

The captured `ToolSearch` description matches the extract `tool/ToolSearch.txt` byte for byte.
From that text, the load works in four steps.

1. A deferred tool shows only its name, in a system reminder.
2. Claude calls `ToolSearch` with a query.
   The query is either `select:` followed by tool names, or keywords.
3. The result returns the full schema of each match, inside a functions block.
4. After that, the tool is callable like a loaded tool.

The captured `ToolSearch` schema has two required fields.
They are `query` and `max_results`, and `max_results` defaults to 5.
The schema sets `additionalProperties` to false.

The placeholder `DeferredToolPlaceholder` has `defer_loading` set to true, and its description says that Claude must never call it.
It costs 93 tokens in both captures.
The capture does not show which setting made the placeholder appear.

The official docs add the switch for tool search.
The variable `ENABLE_TOOL_SEARCH` takes these values:

| Value | Effect |
| --- | --- |
| unset | MCP tools are deferred. Tool search falls back to upfront loading when `ANTHROPIC_BASE_URL` points to a host other than the first party. |
| `true` | MCP tools are deferred. |
| `auto` | Tools load upfront while their definitions stay under 10% of the context window. |
| `auto:N` | The same as `auto`, with the percentage `N` from 0 to 100. |
| `false` | All MCP tools load upfront. |

The deny rule `ToolSearch` turns the tool off.
When tool search is off, the docs say that Claude uses `WaitForMcpServers` instead.

## MCP and plugin tools

MCP tools join the same list as the built-in tools.
By default, the official docs say that their definitions are deferred.
Their names have the form `mcp__<server>__<tool>`.
A tool from a server that a plugin bundles has the form `mcp__plugin_<plugin>_<server>__<tool>`.
Each character outside `A-Z`, `a-z`, `0-9`, `_`, and `-` becomes `_`.

The docs give two ways to load an MCP tool upfront.
A server author sets `anthropic/alwaysLoad` to true in the tool `_meta`.
A configuration sets `alwaysLoad` for a whole server.
A configuration value of `false` keeps all tools of a server deferred.

The captured snippet request sends one MCP tool, `mcp__dotclaude-jev__second_opinion`, with its full schema.
It costs 530 tokens.
The capture does not record the server settings.
Inference: this tool loads upfront, through one of the two settings above, or through the state of tool search in that run.
This is not settled.

## Size of the tool part

The sizes come from the capture reports, which count each part of the request with the token counter.
The dossier's three-run comparison used a one-line prompt.
The captures do not record their prompt, so this page does not assume one.

| Run | Tools | Placeholder | Tool part | Whole request | Share |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | 10,133 for 11 tools | 93 | 10,226 | 18,253 | 56% |
| snippet, dotclaude plugins on | 9,301 for 10 tools, including 530 for the MCP tool | 93 | 9,394 | 19,906 | 47% |

The counts come from `external/capture/*/report-*.json`.
The whole-request counts match the figures in `external/dossier/cc-2.1.296/tool-costs.md`.
That dossier file says it is "not measured", but its three-run comparison has the same counts.
The two runs differ in more than the tools, so the share of each run is a figure for that run only.

## What dotclaude changes in tool descriptions

The `surface` slice of the core plugin changes four tools.
Its source is `src/plugins/dotclaude/slices/surface/`.

- `slice.ts` names the four tools in the filter of the `tool.describe` event: `Agent`, `Bash`, `Read`, and `ListAgents`.
- `adapters/mod.ts` calls the engine answer first.
  It then applies the rule of `domain/tools.ts`.
- The rule replaces a built-in description only when the replacement is shorter.
- The rule sets `isDeferred` to true for a deferred tool, and it never sets it to false.
- A tool that no transform names passes on with no change.

The shorter texts are in `slices/surface/texts.ts/`.
They are written by dotclaude, and they are not copies of the built-in texts.

| Tool | Built-in text, captured | dotclaude text | Change |
| --- | ---: | ---: | --- |
| `Agent` | 2,906 characters | 937 bytes, `tool-agent.md` | shorter |
| `Bash` | 1,492 characters | 850 bytes, `tool-bash.md` | shorter |
| `Read` | 790 characters | 428 bytes, `tool-read.md` | shorter |
| `ListAgents` | 777 characters | no text | deferred, text kept |

The token counts of the two runs show the effect.

| Tool | Vanilla tokens | Snippet tokens |
| --- | ---: | ---: |
| `Agent` | 1,602 | 986 |
| `Bash` | 1,177 | 958 |
| `Read` | 712 | 590 |
| `ListAgents` | 405 | not in the request |

The four changed tools save 1,362 tokens together.
The other seven tool texts have the same bytes in both runs.
Inference: the four changed tools cause the whole difference in the tool part.
The runs differ in other ways too, so this is not a measured effect of the surface alone.

For the full set of prompt cuts, see [Prompt-Surface](Prompt-Surface).
For how a request is built, see [Request-Build](Request-Build).

## Open points

- `Glob` and `Grep` are marked loaded in the dossier, but the captured vanilla request does not send them.
- The captured snippet request sends the MCP tool with its full schema.
  The capture does not show why it is not deferred.
- The extract has no list of the deferred tool names.
- The dossier rows marked "unverified" are not checked.
