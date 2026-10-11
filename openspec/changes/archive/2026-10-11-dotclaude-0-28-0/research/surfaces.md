# Start size on each surface (task 2.6)

The user runs the steps on each surface, and the agent compares the results.

## Versions on this machine (2026-10-10)

| Surface | Claude Code | Source |
| --- | --- | --- |
| Terminal | 2.1.296 | `claude --version` |
| VS Code extension | 2.1.292 | `~/.vscode/extensions/anthropic.claude-code-2.1.292-darwin-arm64/` |
| Desktop app | 2.1.289 | `~/Library/Application Support/Claude/claude-code/2.1.289` |

Each surface runs its own binary.
dotclaude 0.28.0 is tested on 2.1.296, so update VS Code and the desktop app first.
A key, an event, or a built-in plugin that is new in 2.1.296 can be missing on an older surface.

## Steps for each surface (task 20.1)

Do the steps in VS Code and in the desktop app (Code tab), with this repository as the project folder.
Do them also in the terminal, so that the three results come from the same day and the same settings.

1. Update the surface to Claude Code 2.1.296, and record the version that it shows.
2. Put the keys of `wiki/settings/Settings-Snippet.md` in `~/.claude/settings.json`, the user settings file that each surface reads.
   Install `dotclaude@dotclaude` and `dotclaude-sessions@dotclaude`.
3. Start a new session.
4. Send `Hello, World!` as the first prompt.
5. Run `/context`, and copy its output to `research/surfaces/<surface>-context.txt`.
6. Run `/status`, and copy its output to `research/surfaces/<surface>-status.txt`.
   It shows the version, the model, and the setting sources.
7. Run `/plugin`, and note which plugins are on.
8. Tell the agent the surface name.

## What the agent compares

- The start of each surface by source: `dotclaude-start <transcript>` on the newest transcript of the surface in `~/.claude/projects/<project>/`.
  The line `First request` gives the billed tokens of the first request.
- The difference of each surface from the terminal: `dotclaude-start --compare TERMINAL.jsonl SURFACE.jsonl`.
- The setting sources in the `/status` output: the user settings, the managed settings, and the project settings.
- The loaded plugins, skills, and MCP servers.

The agent records one row for each surface in the table below.
Task 20.2 passes when each surface shows the start tokens of the terminal within 3%.

| Surface | Version | First request (tokens) | Difference from the terminal | Config source that differs |
| --- | --- | --- | --- | --- |
| Terminal | | | | |
| VS Code | | | | |
| Desktop app | | | | |

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
