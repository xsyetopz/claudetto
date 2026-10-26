# Agents

This page tells which agents the core plugin `claudetto` ships and how the `agents` slice offers them.
A user reads it to learn which subagent Claude starts for a task.
A contributor reads it before an edit of `agents/` or `slices/agents/`.

## The Main Agent

The plugin `settings.json` sets `agent` to `claudetto:main`.
So each session of a user who installs the plugin starts with this agent.
Its body is `agents/main.md`, and it replaces the main system prompt of Claude Code.
The body has tagged parts: `intro`, `doing_tasks`, `system`, `blocks`, `verification`, `actions`, `tools`, `delegation`, `order`, `counts`, `working`, `communication`, and `session`.

## The Roster

The plugin ships six subagents.
Each has `omitClaudeMd: true`, so it does not load `CLAUDE.md` files, and each has a one-line description of its job.
None sets `maxTurns`.

| Agent | Model | Effort | Tools | Use |
| --- | --- | --- | --- | --- |
| `claudetto:Artemis` | `claude-haiku-5-5` | low | `Read`, `Grep`, `Glob` | A read-only search over many files that returns paths and lines |
| `claudetto:Zeus` | `claude-sonnet-5-5` | medium | `Read`, `Grep`, `Glob` | A split of a task into file sets and steps for parallel `claudetto:Hephaestus` agents |
| `claudetto:Athena` | `claude-sonnet-5-5` | medium | `Read`, `Grep`, `Glob`, `Bash` | A fresh review of a diff against its plan |
| `claudetto:Hermes` | `claude-sonnet-5-5` | medium | `WebSearch`, `WebFetch`, `Read` | Web research that returns its report as its final message |
| `claudetto:Hephaestus` | `claude-sonnet-5-5` | medium | `Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash`, `Monitor` | One planned edit step with its check |
| `claudetto:Apollo` | `claude-haiku-5-5` | low | `Read`, `Grep`, `Glob`, `Bash`, `Monitor` | A run of the checks that lists each failure with file and line |

## What the Slice Does

The `agents` slice adds two hooks:

- `agent.offer` hides each agent of the engine and `claudetto:main`.
  So the model sees only the six agents above.
- `tool.call` on `Agent` sets `subagent_type` to `claudetto:Hephaestus` when a call has none.
  The hook runs before the permission step, which treats a call with no type as `general-purpose`.
  Without it, the `deny` rule for `general-purpose` would refuse the call.

The settings snippet denies the `Agent` types of the engine: `general-purpose`, `Explore`, `Plan`, `claude`, `claude-code-guide`, `statusline-setup`, and `fork`.
It also sets `CLAUDE_CODE_FORK_SUBAGENT` to `0` and the counts of the plan agents to `1`.
Setup writes a cap on the subagents that run at one time, from the plan of the user ([Setup](Setup#subagent-cap)).

## Related Pages

- [Prompt](Prompt)
- [Setup](Setup)
- [Settings Snippet](Settings-Snippet)
- [Controls](Controls)
