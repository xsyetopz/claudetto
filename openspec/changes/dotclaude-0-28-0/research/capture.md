# Capture of the first request, Claude Code 2.1.293

Source: `just capture` (`tools/capture.mjs`), first main-loop request of session `208d77cf`, prompt `Hello, World!`, Opus 5.5, dotclaude 0.27.0 profile, auto mode.
Each token figure is the `count_tokens` result of the full request minus the result without that part.
The only change for `count_tokens` was "no thinking".
The body is in `external/capture/request-3.json`, and the report is `report-2026-10-07T20-46-53-843Z-file.json` (git-ignored).

## Totals

| Measure | Tokens |
| --- | ---: |
| Billed first request (`cache_creation_input_tokens` + `input_tokens`) | 19,443 |
| `count_tokens` of the full request | 19,480 |
| Sum of the parts | 19,186 |
| Rest (message and block wrappers) | 294 |

- The gap of `subagent-usage.md` is closed.
  `/context` under-counts the loaded tools (4.3K against 7.0K) and before the first reply it leaves out the attachment message.
- The request has a `safeguards` field with about 11K chars of auto-mode classifier context.
  It is not in the billed input, because `count_tokens` without it matches the billed total within 0.2%.
- The attachments arrive as one `role: "system"` message after the user message, and `count_tokens` takes it as sent.
- The first request of this session read 0 tokens from cache, against 7,744 in session `ce160872`.
  The cause is not verified (other base URL, or the cache had expired).

## Parts by group

| Group | Tokens | Parts (tokens) |
| --- | ---: | --- |
| Loaded tools | 6,988 | `AskUserQuestion` 1,682, `Bash` 1,249, `Agent` 1,209, `Skill` 623, `Read` 608, `ToolSearch` 535, `ListAgents` 405, `Edit` 348, `Write` 236, deferred placeholder 93 |
| Attachment message | 8,592 | skill listing 2,919, sandbox 2,465, output style 1,385, agent listing 1,147, environment 299, deferred tool names 198, auto mode 179 |
| User message | 2,000 | `CLAUDE.md` 1,338, session context 446, attribution 209, prompt 7 |
| System prompt | 1,606 | harness 628, context management 336, environment 256, intro 185, session guidance 141, billing header 37, CLI prefix 23 |

## Levers, priced

Each saving is the measured cost of the part, or a share of it where the cut is partial (marked **estimated**).

| Lever | Part | Saving | Route | Status |
| --- | --- | ---: | --- | --- |
| `syncClaudeAiSkills: false` | 9 synced skills in the listing | about 1,900 (**estimated**, 5.7K of 8.7K chars) | user setting | documented in bundle, task 6 |
| `name-only` for `openspec-*` | skill listing | about 300 (**estimated**) | `skillOverrides` | task 15 |
| Drop or shorten sandbox text | sandbox | up to 2,465 | `prompt.attachment` if the type is reachable | task 2.9 |
| Defer `AskUserQuestion` | tool | about 1,650 | `tool.describe` `isDeferred` | task 2.19 |
| Defer `ListAgents` | tool | about 380 | `tool.describe` `isDeferred` or deny | task 2.19 |
| Defer `Agent` or `Skill` | tool | 1,209 or 623 | `tool.describe` `isDeferred` | task 2.19, quality risk |
| Shorter tool descriptions | `Bash`, `Agent`, `Read` | part of 3,066 (**estimated** below half, schemas stay) | `tool.describe` | task 9.4 |
| Shorter output style | style | part of 1,385 | own text | task 10.3 |
| Withhold `claude-code-guide` | agent listing | about 400 (**estimated**, 1,066 chars) | `agent.offer` | task 9.3 |
| Replace the harness section | system prompt | part of 628 | `prompt.section` (guard route) | task 8 |
| `CLAUDE.md` | user message | 1,338 | the user's own file | not a dotclaude cut |

The first five rows are about 6,700 tokens, a third of the start.
The output style and the agent listing are dotclaude text, so dotclaude sets their size directly.
