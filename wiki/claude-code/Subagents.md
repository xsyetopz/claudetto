# Subagents

This page says how Claude Code runs a subagent, for `2.1.296`, and what claudetto changes.
Read it if you write an agent file, or if you change the code that acts on subagents.

## How a Subagent Starts

- Claude Code starts a subagent with a fresh context window.
  The subagent does not see the conversation of the main session.
  It does not see the skills that the main session invoked, or the files that the main session read.
  (Official documentation.)
- The main session writes a delegation message.
  The subagent works from that message.
  (Official documentation.)
- The subagent starts in the working directory of the main session.
  A `cd` inside the subagent does not change the main session.
  (Official documentation.)
- The `fork` exception is the only start that inherits the conversation.
  A fork has the same system prompt, tools, and model as the parent.
  (Official documentation.)

## What the Context of a Subagent Holds

For a subagent that is not a fork, the official documentation lists these parts:

- The system prompt.
  It is the body of the agent file, with environment details.
  It does not include the system prompt of the main session.
- The delegation message.
- The `CLAUDE.md` files of the project, unless the agent file sets `omitClaudeMd: true`.
- A git status snapshot.
- The skills that the `skills` field of the agent file lists.
  No other skill loads.
- A snapshot of the other named agents, when the subagent has `SendMessage`.
- The tools of the main session, built-in and MCP, narrowed by the `tools` allowlist and the `disallowedTools` denylist.
  Some tools are always removed, such as `AskUserQuestion`.

claudetto sets the system prompt through the agent body.
The `prompt` slice comment says that a subagent gets its system prompt from its agent body.
So the model block of a variant goes to the end of the task row of the subagent instead.
The call of `agent.spawn` has no model when the agent file chooses it, so `onSpawn` reads the model from the result of `next(e)`.
Then `onAppend` writes the block into the task row, for the `session.append` event.
Both are in `src/plugins/claudetto/slices/prompt/adapters/mod.ts`.

## The Agent Listing and Its Cost

- The `Agent` tool text tells the model to pick an agent type with `subagent_type`.
  When the field is omitted, the general-purpose agent runs.
- The official documentation says that each subagent `description` takes up context.
  Claude uses the description to decide when to delegate.
- The documentation shows a startup warning when the descriptions of the non-built-in subagents exceed `15,000` tokens in total.
  All subagents still load.
- claudetto has six agent files in `src/plugins/claudetto/slices/agents/agents/`.
  This run did not measure the tokens of their descriptions.
  The cost of those descriptions is not confirmed here.
- claudetto drops two built-in agent types from the listing and from dispatch.
  They are `claude-code-guide` and `statusline-setup`.
  The `agent.offer` handler in `src/plugins/claudetto/slices/surface/adapters/mod.ts` handles these two types.
  The list is in `src/plugins/claudetto/slices/surface/domain/agents.ts`.
- claudetto defers the `ListAgents` tool behind `ToolSearch`.
  Its transform is in `src/plugins/claudetto/slices/surface/transforms/ListAgents.ts`.
  Its schema loads only when the model asks for the tool by name.

## `maxTurns` and the Turn Limit

- `maxTurns` sets the most agentic turns that a subagent takes before it stops.
  (Official documentation.)
- At the limit, the binary returns the output of the subagent marked as partial.
  The official documentation says that the partial marking needs version `2.1.246` or later.
  The `2.1.296` binary has the partial-output wording for this case.
- The main session can resume the subagent to continue the work.
  (Official documentation.)
- Each claudetto agent file sets `maxTurns`, from 30 for a read-only role to 60 for the implementer.
  The values are in `AGENT_MAX_TURNS` in `src/plugins/claudetto/slices/agents/limits.ts`.
  The test `tests/claudetto/agents/max-turns.test.ts` pins them.
  Claude Code `2.1.301` accepts `maxTurns` in a plugin agent.
- The `agents` slice also bounds the context of a subagent.
  The `turn.step` hook records the context of each subagent, and the next `tool.call` hook adds a report-now note when the context is over its bound.
  The note is `reportNote` in `src/plugins/claudetto/slices/agents/domain/report.ts`.
  See [Agents](Agents) and [Handoff](Handoff) for the context bound.

## Background Runs and the Return to the Main Session

- The `background` field of the agent file, when `true`, keeps the subagent in the background.
  (Official documentation.)
- The official documentation describes two modes.
  With fork mode on, which is the default in an interactive session, subagents run in the background.
  With fork mode off, which is the default with `-p` and the Agent SDK, Claude runs a subagent in the background by default.
  It runs in the foreground when it needs the result before it continues.
- The `Agent` tool text of `2.1.296` says that agents run in the background by default.
  This does not match the fork-mode rule of the documentation.
  This run did not confirm which rule applies to an interactive session.
- The environment variable `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` set to `1` forces the foreground.
  This is an environment variable of Claude Code, not of claudetto.
- A foreground subagent blocks the main session.
  A background subagent runs at the same time as the main session.
  Background subagents get a smaller built-in tool set.
- Permission prompts of a background subagent appear in the main session.
  They name the subagent.
- A result returns to the main session as a completion notification in a later turn.
  The main session waits for that notification before it reports the result.
  The `Agent` tool text says that the main session must not guess the result before the notification.

## Worktree Isolation

- `isolation: worktree` runs the subagent in a temporary git worktree.
  The subagent gets an isolated copy of the repository.
  (Official documentation and the `Agent` tool text.)
- The worktree starts from the default branch, not from the `HEAD` of the main session.
  (Official documentation.)
- A worktree with no changes is removed at the end of the run.
  Otherwise the tool result returns its path and its branch.
- `Bash` commands run inside the worktree.
  A command that resolves to the main checkout fails with an error.
- claudetto sets `isolation: worktree` on `implementer` only.
  The file is `src/plugins/claudetto/slices/agents/agents/implementer.md`.

## What claudetto Changes

- The `Agent` tool description is shorter.
  The `surface` slice replaces the built-in text only when the new text is shorter.
  The transform is `src/plugins/claudetto/slices/surface/transforms/Agent.ts`.
- `ListAgents` is deferred, and the two dropped agent types are omitted, as described above.
- `agent.spawn` and `session.append` add the model block of a variant to the task row of a subagent.
- Each agent file sets its model, effort, and tools.
  See [Agents](Agents) for the roster and the pins.
- The bounds of a subagent context are in `src/plugins/claudetto/slices/agents/limits.ts`.
  `SUBAGENT_CONTEXT_MAX` is `100_000` tokens.
  `HAIKU_CONTEXT_MAX` is `85_000` tokens for Haiku 5.5, and it applies to the `investigator`.
  `REPORT_MAX_WORDS` is `400`.
- The reason for these choices is in [Decisions Router](Decisions-Router).

## Sources and How the Facts Were Found

- The official subagent documentation at `code.claude.com/docs/en/sub-agents`.
  I read it on 2026-10-13.
  The page does not state a default `maxTurns`.
- The `Agent` tool text of the `2.1.296` binary, in the git-ignored `external/cc-extract/2.1.296/tool/` folder.
  That folder is gone, and the extract of `2.1.299` is in `external/cc-2.1.299/cc-extract-2.1.299/`.
  The agent-type listing in the `listing/` folder held only its headers.
  It names no built-in agent type.
  So this page does not confirm the count of built-in types.
- The turn-limit wording of the binary string table.
  The table has a partial-output message for a run that stops at its turn limit.
  This page does not copy that text.
- The code of claudetto that acts on subagents, read in the checkout of 2026-10-16.

## Open Points

- The default `maxTurns` is not confirmed.
  The documentation does not state it, and the agent files set none.
- The cost of the agent listing for the six claudetto agents is not measured.
  A measurement needs the `start-cost` skill, which this run did not use.
- The background default is not confirmed for an interactive session.
  See the section above.
- The `Haiku 5.5` cost claim in the comment of `agents/limits.ts` is not confirmed in this run.

## Related Pages

- [Agents](Agents): the roster of the agent files, and their pins.
- [Handoff](Handoff): the context bound of a subagent.
- [Tools and Deferral](Tools-And-Deferral): how Claude Code loads and defers the tools.
- [Decisions Router](Decisions-Router): the reasons for the bounds of a subagent.
