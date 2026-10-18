# Claude Code v2.1.296 Bundle: Agents, Models, Effort, and Turn Limits

## Method

I read the string dump of the Claude Code v2.1.296 bundle and the extracted prompt files.
The bundle is minified, so I cite function names, schema keys, and message strings.
Names such as `o1` and `Yte` are minified and are valid for this version only.
I did not run Claude Code, so each claim is a reading of code and not a measurement.

## Findings

### Built-In Agents

| Agent | Model | Effort | `maxTurns` |
| --- | --- | --- | --- |
| `general-purpose` | none set (env var or parent) | none set | none |
| `Explore` | `inherit` with cap | none set | none |
| `Plan` | `inherit` | none set | none |
| `statusline-setup` | `sonnet` | none set | none |
| `claude-code-guide` | `haiku` | none set | none |
| `fork` | `inherit` | none set | `200` |

- Claude Code v2.1.296 bundle: only the `fork` definition sets `maxTurns:200`.
  This is the likely source of the "200-turn limit" that users report.
  `fork` runs only through `subagent_type: "fork"` when a gate is on.
- The function `Bge` turns the `Explore` model `inherit` into `{inheritCap:"opus"}` on the first-party API.
  The cap applies when the parent family ranks above `opus` (`Q2n`: `haiku` 0, `sonnet` 1, `opus` 2, `fable` 3).
  So `Explore` under a `fable` root runs on `opus`.
  `CLAUDE_CODE_DISABLE_EXPLORE_INHERIT_CAP` turns the cap off.

### Model Resolution

The function `o1` resolves the subagent model in this order.

1. With `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` on, `lAt` drops the tool `model` parameter and the frontmatter model.
   Only the env var applies.
2. The `model` parameter of the `Agent` call, when not `inherit`.
3. The `model` of the agent definition, when not `inherit`.
4. The env var `CLAUDE_CODE_SUBAGENT_MODEL` (function `Yte`).
5. The parent model.

- A frontmatter `model: inherit` returns the parent model at once and skips the env var.
  Without `_FORCE`, the env var affects only agents that set no `model`.

### Model Catalog

The bundle ships a catalog with a 1M window for all five models.
`haiku_55` costs 5 times more above 100000 prompt tokens.

| Model id | `default_effort` | Price in/out per 1M tokens |
| --- | --- | --- |
| `claude-fable-5-1` (and `claude-mythos-5-1`) | `high` | 10 / 50 |
| `claude-opus-5-5` | `medium` | 4 / 20 |
| `claude-sonnet-5-5` | `medium` | 2 / 10 |
| `claude-haiku-5-5` | `medium` | 0.1 / 0.5 |

### The Per-Model Effort Table

The catalog field `effort_cost_index` is the table that users report.
The function `uLt` divides the cost of a level by the cost of the model default level.
The picker shows "{from} effort is ~Nx the estimated cost of {default} (the default)".

| Model | `low` | `medium` | `high` | `xhigh` | `max` |
| --- | --- | --- | --- | --- | --- |
| `claude-fable-5-1` | 0.75 | 0.86 | 1 | 1.38 | 1.74 |
| `claude-sonnet-5` | 0.47 | 0.74 | 1 | 2.41 | 5.59 |

- The built-in catalog has no `effort_cost_index` for `opus-5-5`, `sonnet-5-5`, and `haiku-5-5`.
  Then `uLt` returns null and the picker shows only "uses more tokens per task".

### Plugin Agent `effort`

- The function `w_n` sets the subagent effort to the agent `effort` first, and to the inherited effort otherwise.
- The `Agent` tool `effort` parameter exists too, and the root should set it only when the user asks.
- `CLAUDE_CODE_EFFORT_LEVEL` (function `Y0`) removes `effort` from the `Agent` tool schema.
- Plugin agents ignore `permissionMode`, `hooks`, and `mcpServers`.
  The loader warns "which is ignored for plugin agents".
  The keys `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, and `autoCompactWindow` stay.

### How `maxTurns` Is Enforced

- The schema says "Maximum number of agentic turns (API round-trips) before stopping".
  The loader needs a positive integer.
- The spawn code passes `maxTurns: V ?? e.maxTurns`.
  With both unset there is no limit, because the check `v&&Sn+1>v` is false.
- After the tool results of a round, the loop checks `Zn=Sn+1` against the limit.
  Past the limit, it emits the attachment `max_turns_reached` and returns `{reason:"max_turns"}`.
  The model gets no extra turn to write a report.
- The root receives the partial result with a note: "NOTE: this agent stopped at its N-turn limit before finishing."
  The note adds "PARTIAL output" when text exists, or "had produced no report" when none exists.
  For agents other than `Explore` and `Plan`, it adds a hint to send the agent a message to continue.

### Nesting and Context

- Subagents can spawn subagents.
  The function `_E` gives the depth cap: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, else a GrowthBook value, else `3`.
- The frontmatter `autoCompactWindow` is the "Token count at which this agent compacts its own conversation".
  The range is 100000 to 1000000, and it can only lower the inherited window.
- The default window is the model context size.
  The compact threshold is the window minus 13000 tokens (function `O4`), and the block level is 3000 below the window.

## Implications for the Dotclaude Agents

- Claude Code gives no turn limit to `Explore`, `Plan`, or `general-purpose`.
  A `maxTurns` value in dotclaude is a choice that needs a reason.
- A hit limit gives no final report turn.
  The root gets partial text or "no report", and can continue the agent by message.
  So a low limit on a worker that must report (`planner`, `reviewer`, `researcher`) risks an empty result.
  A limit fits best as a cost guard on a cheap read-only worker.
- Set `model` and `effort` in each frontmatter, because an agent with no `effort` inherits the root effort.
- The catalog default of `opus-5-5`, `sonnet-5-5`, and `haiku-5-5` is `medium`.
  The `planner`, `reviewer`, and `debugger` use `high`, which is above the default.
  No cost ratio exists for these levels, so a cost claim needs a measurement.
- "No subagent orchestrates" is not a default.
  Depth 3 is allowed, so each dotclaude agent must block the `Agent` tool with `disallowedTools`.

## Open Questions

- Does `CLAUDE_CODE_EFFORT_LEVEL` override a frontmatter `effort` of a subagent?
