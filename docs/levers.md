# Subagent Levers

The keys that bound or shape a subagent, checked against Claude Code `2.1.317`: the key is in the vendored types (`plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts`) or in the binary (`strings "$(readlink -f "$(command -v claude)")" | rg KEY`). The request sizes of the settings keys are in `docs/surfaces.md`.

## Frontmatter of an Agent File

These are per-agent keys. They sit in `plugins/claudetto/agents/*.md`, not in a settings file.

| Key | Type in the types file | Value in the four shipped subagents |
| --- | --- | --- |
| `effort` | level name | `medium` |
| `tools` | tool names | `Artemis`: `Read, Grep, Glob`. `Athena`: `Read, Bash`. `Hephaestus`: `Read, Edit, Write, Bash`. `Hermes`: `WebSearch, WebFetch, Read` |
| `omitClaudeMd` | `true` only | `true` |
| `maxTurns` | positive integer | not set |
| `autoCompactWindow` | integer | not set on an agent |

`autoCompactWindow` is set per model in the `modelSettings` that setup writes (`plugins/claudetto/src/tiers/snippet.ts`), not per agent.

## Environment Keys

| Key | Where it is used |
| --- | --- |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | Present in the binary, with the message "Concurrent subagent limit reached". `plugins/claudetto/src/blocks/run-limits/block.ts` reads it and `crowded` in `blocks/run-limits/spawn.ts` compares the running count with it. |
| `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` | Present in the binary. Not set by claudetto. |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | Present in the binary, with the message "Subagent nesting limit reached". Not set by claudetto. |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | Present in the binary. Not set by claudetto. |

The subagent cap by plan is `PLAN_CAPS` in `plugins/claudetto/src/tiers/tiers.ts`: `claude_pro` 3, `default_claude_max_5x` 4, `default_claude_max_20x` 5. The setup snippet writes the cap of the chosen plan, and the `run-limits` block asks the model to wait when the running count reaches it.

## Keys Not Used

These keys exist in `2.1.317` and claudetto does not set them. Each is present in the binary strings.

- `alwaysThinkingEnabled`, `advisorModel`, `fileCheckpointingEnabled`, `claudeMdExcludes`, `respondToBashCommands`.
- `skillListingBudgetFraction`, `skillListingMaxDescChars`.
- `promptCacheTtl`, `subagentPromptCacheTtl`.
- `CLAUDE_CODE_COLD_COMPACT`, `CLAUDE_CODE_GOAL_CHECKIN_MINUTES`, `CLAUDE_CODE_THRIFTY_SONIC`.

What each one does to the request or to the cost is not measured here.
