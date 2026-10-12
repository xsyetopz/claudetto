# Context and handoff

This page says how the core plugin `dotclaude` bounds the context of a subagent and of the main session.
It covers the report-now note of the subagents and the handoff of the main session.
Both parts are in the `handoff` slice (`src/plugins/dotclaude/slices/handoff/`).
The bounds are in `slices/handoff/limits.ts`, because only this slice reads them.
Tests pin each copy of a bound in code and config.

## Why

- The [settings snippet](Settings-Snippet) sets `DISABLE_COMPACT` to `1`.
  Claude Code then does not summarize the context, so a long session keeps its full context until it ends.
- A long context costs more on each request.
  The measured sessions had large subagent contexts and repeated file reads.
  See [Usage evidence](Usage-Evidence).
- The plugin therefore bounds the context in two ways.
  A subagent gets a note to report now.
  The main session gets a handoff to a new session.
- The choice of the default is on [Decisions](Decisions).

## Bounds

| Name | Value | File | Use |
| --- | --- | --- | --- |
| `SUBAGENT_CONTEXT_MAX` | 100000 tokens | `slices/handoff/limits.ts` | The context of a subagent, from which the hook tells it to report now. |
| `HAIKU_CONTEXT_MAX` | 85000 tokens | `slices/handoff/limits.ts` | The same bound for a subagent on Haiku 5.5. |
| `TURNS_LEFT_AT` | 4 | `slices/handoff/limits.ts` | The turns left of a subagent, from which the hook tells it to report now. |
| `REPORT_MAX_WORDS` | 400 | `slices/handoff/limits.ts` | The most words in the final report of an agent. |
| `AGENT_MAX_TURNS` | 31 to 61 by agent type | `slices/handoff/limits.ts` | The `maxTurns` of each agent type. |
| `CONTEXT_PERCENT` | 60 | `slices/handoff/limits.ts` | The share of the context window, from which the main session starts a handoff. |
| `HANDOFF_WAIT_TURNS` | 2 | `slices/handoff/limits.ts` | The turns of the main session that a started handoff waits for its file. |
| `HANDOFF_RETRY_MAX` | 1 | `slices/handoff/limits.ts` | The times that the hook submits the write prompt again when no file appears. |
| `DEFAULT_MAIN_HANDOVER` | `manual` | `slices/handoff/limits.ts` | The default of the `mainHandover` option. |

`AGENT_MAX_TURNS` gives `investigator` 31, `planner`, `researcher`, and `reviewer` 41, and `implementer` and `debugger` 61.
The smallest `maxTurns` must stay above `TURNS_LEFT_AT`.
A test pins each value to the front matter of the agent file, as described on [Agents](Agents).

The context of a request is the sum of its input, cache creation, and cache read tokens (`contextTokens` in `slices/handoff/domain/context.ts`).
The bound of a subagent depends on its model (`boundFor` in the same file).

## Subagent report

The `turn.step` hook (`onTurnStep` in `slices/handoff/adapters/mod.ts`) keeps the context and the turn count of each subagent.
Its filter matches only a step with an `agentId`, so the main session is not counted.

The `tool.call` hook (`onToolCall`) adds a note to the result of a subagent when a rule of `reportNote` in `slices/handoff/domain/context.ts` fires.
The rule fires when the context is over the bound of the model, or when the turns left are `TURNS_LEFT_AT` or fewer.
The note tells the subagent to commit its work and to report now, within `REPORT_MAX_WORDS` words.

- The hook tells the subagent and does not block it.
  A block would lose the work of the run.
- Below the bounds, the hook adds nothing.
- A run that reaches `maxTurns` without a report returns its partial output, marked as incomplete.
  The comment of `TURNS_LEFT_AT` gives the use of the turns: two turns commit the work, one turn writes the report, and one turn is spare.

## Main session handoff

The `mainHandover` option has three values, from `MAIN_HANDOVERS`.

| Value | What the plugin does |
| --- | --- |
| `auto` | It writes a handoff file, runs `/clear`, and submits a resume prompt. |
| `manual` | It adds a hint to run `/dotclaude:handoff`, once for each kind of trigger in an episode. |
| `off` | It does nothing. |

The default is `manual`.
The limits file says that it stays `manual` until the cost of a handoff is measured against a compaction.

The triggers for the main session are these.

- The context share reaches `CONTEXT_PERCENT`.
  `overContext` in `slices/handoff/domain/trigger.ts` makes the test.
- A package of the change goes to `done`.
  `laneDoneCall` in the same file makes the test.

`onTurnComplete` in `slices/handoff/adapters/mod.ts` checks the triggers at the end of each turn of the main session.
In `auto` mode, it asks Claude to write the file with `writePrompt` (`slices/handoff/domain/text.ts`).
It then waits for the file for `HANDOFF_WAIT_TURNS` turns.
If no file appears, it submits the write prompt again up to `HANDOFF_RETRY_MAX` times.
When the file is there, `resume` runs `/clear` and submits `resumeText`, which names the file and the next package.

The file name has this form: `handoff-<UTC time>.md`, from `handoffName` in `slices/handoff/domain/files.ts`.
The files go to `.dotclaude/handoff/`, which is `HANDOFF_DIR` in `src/kernel/paths.ts`.
The `/handoff` skill is in `slices/handoff/skills/handoff/SKILL.md`.
Its `skill.prompt` hook (`onSkill`) adds the file path to the skill text, and it runs for the skill `handoff` only.

## Bounds on file reads

The context also grows from file reads.
The plugin uses these rules to limit them.

- The snippet sets `bashOutputMaxChars` to `4000`.
  Claude Code saves a longer output to a file, and sends a preview and the path.
- The `tool.call` handler on `Bash` in `slices/guard/adapters/mod.ts` denies a command that prints a file.
  The check covers `cat`, `sed -n` with a print range, `head`, and `tail`, in each part of a compound command.
  A print into a pipe, a redirect, a substitution, and a heredoc stay allowed.
  The deny reason gives the `Read` call with the same file and range.
- A file over `READ_MAX_BYTES` is denied by its size.
  `READ_MAX_BYTES` is 4 MiB, in `slices/guard/limits.ts`.

## Tests

- `tests/dotclaude/handoff/context.test.ts` checks the report-now note.
- `tests/dotclaude/handoff/trigger.test.ts` checks the triggers of the main session.
- `slices/handoff/lab/handoff.test.ts` runs the hook lab for the handoff hooks.
- `tests/dotclaude/settings-pin.test.ts` keeps the settings snippet equal to the plugin settings.

## Related pages

- [Prompt surface](Prompt-Surface) describes the text that the plugin adds to the prompt.
- [Agents](Agents) describes the subagent types and their `maxTurns`.
- [Decisions](Decisions) gives the choices behind these bounds.
