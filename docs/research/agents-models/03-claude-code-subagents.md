# R03 Claude Code docs on subagents and models

## Sources

- Subagents page: <https://code.claude.com/docs/en/sub-agents> (read 2026-10-13, first 100000 of 108547 characters).
- Model configuration page: <https://code.claude.com/docs/en/model-config> (read 2026-10-13, first 100000 of 116497 characters).
- Project wiki: `wiki/claude-code/Subagents.md`, `wiki/dotclaude/Agents.md`, `wiki/rationale/Decisions-Tools.md`, `wiki/reference/Bounds.md`.
- Not read: agent teams, costs, and best-practices pages.
- Not read: the tail of both pages.

## Findings

### Frontmatter

- `maxTurns` is "Maximum number of agentic turns before the subagent stops." (Subagents page, frontmatter table.)
- The page states no default value for `maxTurns`.
  So the docs do not show a default limit.
  An agent file without `maxTurns` has no documented limit.
- At the limit: "Claude Code returns its output marked as partial, and Claude can resume it to continue." (Subagents page.)
  The stop is not a failure.
  The root can resume the agent.
- `model` takes `sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit`. (Subagents page.)
  `inherit` is a value of `model`, not a field.
- If `model` is omitted, Claude Code uses this order. (Subagents page, "Choose a model".)
  1. The `model` parameter of the call.
  2. The `model` frontmatter of the agent.
  3. `CLAUDE_CODE_SUBAGENT_MODEL`.
  4. The model of the main conversation.
- The page does not say that `inherit` is the default or is recommended.
  Omitting `model` has the same final fallback.
- `effort` "Overrides the session effort level, but not the `CLAUDE_CODE_EFFORT_LEVEL` environment variable." (Subagents page.)
  Valid levels are `low`, `medium`, `high`, `xhigh`, and `max`.
- `tools` "Inherits every tool available to subagents if omitted." (Subagents page.)
- "Plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields." (Subagents page.)
  Plugin agents may set `model`, `effort`, `maxTurns`, and `tools`.

### Model configuration

- Aliases "point to the recommended version for your provider and update over time." (Model configuration page.)
  A full ID such as `claude-opus-5-5` pins a version.
- The `fable` alias resolves to Fable 5.1 unless `ANTHROPIC_DEFAULT_FABLE_MODEL` is set. (Model configuration page.)
  Neither Fable model is the default of any plan, so the user must select it.
  The page calls Fable/Mythos "suited to tasks larger than a single sitting."
- `opusplan` uses `opus` in plan mode and `sonnet` in execution. (Model configuration page.)
  This is a session setting of the root, not a subagent setting.
- Opus 5.5, Sonnet 5.5, and Haiku 5.5 support `low` to `max` with `xhigh`.
  Their default effort is `medium`, and every other effort-capable model defaults to `high`. (Model configuration page, "Effort levels".)
- A level that the model does not support falls back to the highest supported level below it.
- "To keep a custom subagent on a smaller model, set `model` in its definition." (Model configuration page.)
- A `/model` switch reaches subagents that inherit the main model.
- `CLAUDE_CODE_SUBAGENT_MODEL` "is a default, so a subagent's definition or a model Claude passes still takes precedence over it." (Subagents page.)
  Set `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` to `1` to force one model on every subagent (v2.1.257 or later).
  The `Mythos` name does not appear in the part of the model page that I read.

### Built-in subagents and delegation

- `Explore` is read-only and runs on the main model, with exceptions for Fable/Mythos and some providers. (Subagents page.)
- `Plan` is read-only and inherits the main model. (Subagents page.)
- `general-purpose` has all tools. (Subagents page.)
- The page lists no turn or token limit for these three.
- "The built-in Explore and Plan agents are one-shot and return no agent ID, so Claude can't resume them." (Subagents page.)
- "Claude automatically delegates tasks based on the task description in your request, the `description` field in subagent configurations, and current context." (Subagents page.)
  So the `description` field of each agent drives delegation.
- Nesting: "By default, a subagent can spawn subagents of its own, up to three layers below the main conversation." (Subagents page.)
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` turns nesting off.
  The docs allow nesting, so the "no subagent orchestrates" rule is a project choice, not a platform default.

### What the project claims today

- `wiki/claude-code/Subagents.md` says the docs give no default `maxTurns` and that the agent files always set it.
- `wiki/dotclaude/Agents.md` says a roster test pins each `maxTurns` to `turnBound`.
- `wiki/rationale/Decisions-Tools.md` says `maxTurns` is the third layer, with one spare turn.
  The first layers are a hook that tells the run to report at the bound.
- `wiki/reference/Bounds.md` says `AGENT_MAX_TURNS` spans `31` to `61`.
- The wiki rationale for "one spare turn" is project design, not an official claim.

## Implications for the dotclaude agents

- `maxTurns` is optional, and the docs show no default.
  Removing it from the implementer is allowed by the docs.
  Context is then the real limit, and `maxTurns` does not cause that limit.
- A hit limit gives partial output that the root can resume.
  The 2026-10-13 partial results match this documented behavior.
  The cost was uncommitted work, so the fix is in the brief and the hook, not in the platform.
- Raising or removing `maxTurns` does not fix a context limit.
  Smaller slices, or a commit per step, address both limits.
- Read-only agents (`investigator`, `reviewer`) gain most from a limit, because a loop there has no output.
  A limit is a cost guard for them.
- The docs give no advice that `inherit` is best.
  `inherit` ties a worker to the model of the session, which can be Fable/Mythos, so cost and behavior change with the user's `/model`.
  Pinned models keep roster behavior stable and the cost known.
  `inherit` fits only an agent that must match the session on purpose.
- `effort` in frontmatter beats the session level.
  `CLAUDE_CODE_EFFORT_LEVEL` beats the frontmatter, so a pinned effort is not absolute.
- Because Opus 5.5, Sonnet 5.5, and Haiku 5.5 default to `medium`, an explicit `medium` is redundant but harmless.
  It documents intent and survives a default change.
- To enforce "no subagent orchestrates", the agent files must not give the `Agent` tool.
  The agent definitions in this session show "All tools except Agent" for `implementer` and `debugger`.
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` is the platform switch, but it is an env var of the user.
- Delegation depends on the `description`, so keep each one precise.

## Open questions

- Does `maxTurns` count a tool call, or a model response with its tool calls?
  The docs say only "agentic turns".
- Is there a hidden default limit in the runtime?
  The docs state none, and the wiki says it is not confirmed.
  A sandbox test with an agent that has no `maxTurns` can show it.
- How does `resume` count turns after a partial stop?
  The page does not say if the counter resets.
- Does a `fable` alias in a plugin agent work on all plans?
  The docs say the user must select Fable/Mythos, so an agent that pins it may fail or fall back.
- What do the agent teams, costs, and best-practices pages say?
- Does a hook-based "report now" layer still work if `maxTurns` is removed?
