# Start size on each surface (task 2.6)

The user runs the steps on each surface, and the agent compares the results.

## Versions on this machine (2026-10-08)

| Surface | Claude Code | Source |
| --- | --- | --- |
| Terminal | 2.1.293 | `claude --version` |
| VS Code extension | 2.1.292 | `~/.vscode/extensions/anthropic.claude-code-2.1.292-darwin-arm64/resources/native-binary/claude` |
| Desktop app | 2.1.289 | `~/Library/Application Support/Claude/claude-code/2.1.289` |

Each surface runs its own binary.
A key, an event, or a built-in plugin that is new in 2.1.293 can be missing or different on the other two.
This is a candidate cause of the 30K start, and the run shows whether it is the cause.

## Steps for each surface

Do the steps in the terminal, in VS Code, and in the desktop app (Code tab), with this repository as the project folder.
Do them after task 2.22, so that all three surfaces have the same managed drop-in.

1. Start a new session.
1. Send `Hello, World!` as the first prompt.
1. Run `/context`, and copy its output to `research/surfaces/<surface>-context.txt`.
1. Run `/status`, and copy its output to `research/surfaces/<surface>-status.txt`.
   It shows the version, the model, and the setting sources.
1. Run `/plugin`, and note which plugins are on, with their tier if it shows one.
1. Tell the agent the surface name.

## What the agent compares

- The billed first request: `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens` of the first assistant message in the newest transcript in `~/.claude/projects/<project>/`.
- The `prompt_snapshot` attachment of the same transcript: the tool list and the system text.
- The setting sources in the `/status` output: user settings, the managed file, the managed drop-in, and project settings.
- The loaded plugins and skills, and the MCP servers.
- The surface whose start is near 30K, the part that differs from the terminal start, and the config source or version that causes it.

The agent records the result in `research/probes.md` under 2.6.

## Terminal result (task 2.6)

The agent ran the terminal binary 2.1.293 in headless sandboxes (`tools/sandbox.mjs`) through the capture proxy.
Each arm sent `Hello, World! (arm <name>)` on Sonnet 5.5 with the repo as the project.
Billed is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` of the first assistant usage.
Bodies are in `$TMPDIR/dotclaude-capture` (requests 647, 655, 670, 671).
The token counter could not reach the API from the agent sandbox, so part sizes are in chars.

| Arm | Config | Billed tokens | Tools | Chars: tools / system / messages |
| --- | --- | ---: | ---: | --- |
| `profile` | 0.27.0 profile, plugins, tool search on | 13,949 | 9 | 15,413 / 4,039 / 18,341 |
| `vanilla` | `{}` settings, no plugins, tool search on | 15,614 | 12 | 26,744 / 5,801 / 10,445 |
| `profile`, tool search off | same, `ENABLE_TOOL_SEARCH=false` | 25,483 | 19 | 47,716 / 4,239 / 17,907 |
| `vanilla`, tool search off | same, `ENABLE_TOOL_SEARCH=false` | 27,376 | 22 | 59,050 / 6,030 / 10,459 |
| `live` (this agent session) | profile plus plugins, long prompt | 21,110 | n/a | n/a |

The 30K start did not reproduce.
The largest start is 27.4K, and only with tool search off and no profile.
The profile start in this run is 13.9K, below the 19,443 of `capture.md`.
That baseline was Opus 5.5 with auto mode, and this run is Sonnet 5.5 without it.

### Parts that differ between `vanilla` and `profile` (tool search on)

Billed difference: 1,665 tokens in favor of the profile.

| Part | `vanilla` | `profile` | Source of the difference |
| --- | --- | --- | --- |
| Tools `Workflow`, `ScheduleWakeup`, `ReportFindings` | 12,163 chars | absent | `enableWorkflows` of the profile (inferred) |
| System prompt | 5,665 chars in the last block, `# Memory` section | 3,913 chars, no `# Memory` | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`, `autoMemoryEnabled` (inferred) |
| `Bash` schema | 3,186 chars | 4,018 chars | not traced |
| Attachment message | 9,281 chars | 17,179 chars | profile adds the sandbox text, the output style, and the agent listing |

The profile adds about 7.9K chars of attachment and removes about 12.2K chars of tool schema and 1.7K chars of system prompt.
The net is a smaller start.
With tool search off, the same tool set becomes 47.7K chars (profile) and 59.1K chars (vanilla), because the deferred tools load in full.
Tool search off moves the start by about 11.5K tokens in both arms.

### Config source that explains 30K in the terminal

The profile reaches the terminal through user settings in `~/.claude/settings.json`.
This file holds the `env` block with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` and the other 0.27.0 keys, and the managed drop-in holds only three `env` keys.
A terminal window that does not read this file gets the vanilla tool set and system prompt.
That is a window with another `CLAUDE_CONFIG_DIR`, or any window where the profile did not apply.
The sandbox arms show that this source alone gives 15.6K with tool search on.
The rest of a 30K start needs tool search off (27.4K), so a second source adds to it: a base URL, `ENABLE_TOOL_SEARCH`, or a first-party setting that makes the loaded tool set full.
Plus the `CLAUDE.md`, MCP servers, or connectors of that window (inferred, not run).
The sandbox log shows an attempt to reach `mcp.fal.ai`, which is a claude.ai connector, so connectors do load in a vanilla config.

### Limits

- Part sizes are chars, not tokens.
- The `/context` output of the profile arm says 7.9K of 300K, which leaves out the attachment message and the deferred tools, as `capture.md` found.
- Tool search was on in the capture because the proxy sets a non-first-party base URL.
  A terminal on the real API URL can differ, and the user must confirm the setting of the 30K window.

## Source of the 30K figure (user, 2026-10-08)

- The user saw the 30K start on the dotclaude status line, not in `/context`.
- Next check: compare the context figure of the 0.27.0 status line (`status-line/statusline.mjs`) with the billed first request of the same session.
  A status line that adds `cache_read_input_tokens` and `cache_creation_input_tokens` twice, or counts the output, can show 30K for a 14K to 21K start.
