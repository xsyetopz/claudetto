## ADDED Requirements

### Requirement: Prefix Stability Is Measured on the Request Body

A claim about what breaks the prompt cache SHALL be checked by comparing request bodies from an interactive session against the fake Messages API: the earlier `tools`, `system`, and `messages` SHALL be a byte-identical prefix of the later body, with `cache_control` markers and the string-or-block form of `content` left out. The check is `bun claudekit/prefix/main.ts NAME`.

#### Scenario: Unchanged Session

- **WHEN** `bun claudekit/prefix/main.ts baseline` runs three turns on Claude Code `2.1.316`
- **THEN** every request keeps the prefix of the one before it

### Requirement: A Kept Prefix Is Not a Cache Read

A prefix kept on the fake API SHALL be reported as a kept prefix, not as a cache read, because whether the API reads its cache is not observable without a paid call.

#### Scenario: Fake API Run

- **WHEN** a scenario of `claudekit/prefix/main.ts` keeps the prefix
- **THEN** the report names the kept prefix and no cache read

### Requirement: Events That Keep the Prefix

On Claude Code `2.1.316`, each of these events SHALL leave `tools`, `system`, and the earlier `messages` byte-identical, because the CLI appends a `system`-role message and does not rewrite earlier ones. claudetto MAY rely on this.

#### Scenario: Appended Context

- **WHEN** a skill and a command are added to a watched folder mid-session (`skill`), the output style is changed (`output-style`), the permission mode is cycled with Shift+Tab (`permission-mode`), or a file is read and then edited (`file-edit`)
- **THEN** the next request keeps the prefix, and the change is a new `system` message at the end

#### Scenario: Tool Search Announces an MCP Change

- **WHEN** an MCP server is disabled and enabled again with tool search on, the default (`mcp-search-on`)
- **THEN** `tools` is unchanged and the change is a new `system` message ("deferred tools are no longer available", "are available again")

#### Scenario: Subagent

- **WHEN** a subagent is spawned (`subagent`)
- **THEN** its request has its own `model`, `tools`, and `system`, and the main thread's next request keeps the prefix of the request before the spawn

#### Scenario: Rewind

- **WHEN** the conversation is rewound to before a turn and a new prompt is sent (`rewind`)
- **THEN** `tools`, `system`, and the messages before the removed turn are byte-identical to those of the earlier request, and only the new user message differs

#### Scenario: Compaction Request

- **WHEN** `/compact` runs (`compact`)
- **THEN** the summary request keeps `tools`, `system`, and every message but the last, and rewrites only the last user message (a trailing newline and the summary instruction), so it can read the cache up to that message

### Requirement: Events That Change the Prefix

These events SHALL be treated as cache breaks.

#### Scenario: Model Change

- **WHEN** `/model` switches the model mid-session (`model`), or plan mode runs under `--model opusplan` (`opusplan`)
- **THEN** only the top-level `model` field differs and a message "You are powered by the model named ..." is appended; the cache is per model, so the next request reads nothing

#### Scenario: MCP Server Without Tool Search

- **WHEN** an MCP server is enabled or disabled with `ENABLE_TOOL_SEARCH=false` (`mcp-search-off`)
- **THEN** the first difference is at `tools[22]`, the first MCP tool after the built-in tools, so the prefix is kept up to that tool and `system` and `messages` after it are not

#### Scenario: Effort Change

- **WHEN** `/effort low` follows a turn at `medium` (`effort`)
- **THEN** only `output_config.effort` differs and `tools`, `system`, and `messages` are byte-identical; whether the API counts that field in its cache key is not measured

#### Scenario: Compaction Result

- **WHEN** the first request after `/compact` is sent (`compact`)
- **THEN** `tools` is kept, `system[0]` differs (its `cc_version` suffix is derived from the first user message, which is now the summary), and `messages` start over

#### Scenario: Upgrade

- **WHEN** the CLI version changes
- **THEN** `system[0]`, the `x-anthropic-billing-header` block, differs because it carries `cc_version=`; this is read from the body, and no second version was run

### Requirement: Caching Switch Removes the Markers

`DISABLE_PROMPT_CACHING=1` SHALL remove every `cache_control` marker from the request body.

#### Scenario: DISABLE_PROMPT_CACHING

- **WHEN** a session runs with `DISABLE_PROMPT_CACHING=1` (`no-caching`)
- **THEN** no request body holds a `cache_control` marker, against three markers per request without it

#### Scenario: Attribution Header

- **WHEN** a session runs with `CLAUDE_CODE_ATTRIBUTION_HEADER=false`
- **THEN** the `x-anthropic-billing-header` block is absent from `system`

### Requirement: Claudetto Keeps the Prefix

claudetto's hooks, status line, and `Concise` output style SHALL NOT change an earlier part of the request mid-session; they only append.

#### Scenario: Measured Session

- **WHEN** `bun claudekit/prefix/main.ts claudetto` runs several turns with the plugin loaded and the shipped settings, `claudetto:Concise`, a Read and Edit turn, and a plan-mode switch
- **THEN** every request keeps the prefix of the one before it; `prompt.submit` appends `Budget: context N% left` as a `system` message, the style reminder is appended after each turn, and the status line is not in any request

### Requirement: Claims Not Checkable Without a Paid Call

A claim that the fake API cannot show SHALL be recorded as untested, with the reason.

#### Scenario: Untestable Free

- **WHEN** a claim concerns fast mode, many images, or a real upgrade
- **THEN** it is recorded as untested: `/fast` answers "Fast mode is not available" on the fake login, 260 one-pixel images in `claude -p` were never dropped and kept the prefix, and only one Claude Code version is installed
