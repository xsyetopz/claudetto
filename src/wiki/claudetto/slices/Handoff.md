# Handoff

This page tells how the core plugin `claudetto` replaces the summary of a compaction with a handoff.
A user who wants to know what stays in the context after a compaction and a contributor who edits the `handoff` slice read it.

## What the Handoff Does

Claude Code compacts the main thread when the context is long.
The built-in compaction writes a summary of the session.
The `handoff` slice writes a handoff in place of that summary.

After a handoff, the context holds two parts:

1. One user message.
   It has the text of the first user message of the session and the handoff.
   The handoff gives the task, each step that is done, and the next step.
2. The tail: the newest messages, from the first message of the last reply that has a tool use to the end.

An image or an attachment of the first user message does not stay.
The tail keeps each newest tool call with its result, so the model does not run a step again.
When the last message is a reply with no tool use, the turn has ended, and there is no tail.

The handoff also goes to a file.
The user message names the file, so you and the model can read it again.

## The Hook

The slice has three hooks:

| Hook | Phase | What it does |
| --- | --- | --- |
| `session.compact` | `answer` | Writes the handoff and gives the new context in place of the summary. |
| `turn.complete` | `observe` | Notes the time of the end of a turn of the main thread. |
| `turn.step` | `observe` | Notes the time of each model request of the main thread. |

The `session.compact` hook runs for the triggers `auto`, `manual`, and `plugin`.
A compaction of a subagent passes on with no change.

## When It Runs

`claudetto` sets the trigger of the auto compaction in the settings snippet.
The trigger is a context size below the point where Claude Code blocks a request with "Prompt is too long".

| Model family | Auto compaction starts at |
| --- | --- |
| Opus, Sonnet, and Fable | {{HANDOFF_TRIGGER_TOKENS}} tokens of a {{CONTEXT_WINDOW}}-token window |
| Haiku | {{HAIKU_HANDOFF_TRIGGER_TOKENS}} tokens |

The snippet sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `autoCompactWindow` for this.
It sets a window for `claude-haiku-5-5` with `modelSettings`.
The same size is the bound of the new context: when the new context is not below the trigger of the session model, the handoff does not run (see [When the Handoff Fails](#when-the-handoff-fails)).
See [Settings Snippet](Settings-Snippet) for the keys.

## How the Handoff Is Written

The cache of the session decides how the hook writes the handoff.
The hook takes the cache as cold when no turn or model request of the main thread ended in the last hour.
It also takes the cache as cold when it has seen no request in this process, such as after `--resume`.

| Cache | Mode | Cost |
| --- | --- | --- |
| Warm | A fork of the session writes the handoff. | One model request, mostly read from the cache. |
| Cold | The hook writes the handoff from the messages. | No model call. |

A cold cache would make a fork read the full history as uncached input.
If the clock fails, the hook takes the cache as warm.

`claudetto` sets `CLAUDE_CODE_PROMPT_CACHE_TTL` to `1h` in the settings snippet, so the main thread keeps a 1-hour cache.
Claude Code bills a 1-hour cache write at a higher rate.
A model request of the main thread renews the time of the cache, so a long turn stays warm.
A subagent keeps the 5-minute default, and its requests do not renew the time.

On a terminal, the status line shows `Writing the handoff…` while the hook works, and a notice names the file and its size.
In `-p` mode the hooks draw nothing.

## The Warm Handoff

The prompt of the fork asks for a handoff of 10 lines or less as a Markdown list.
The prompt asks for these items:

- The task, each step that is done, and the next step.
- Each exact value with its label, in backticks.
- The exact text of each error, in backticks.
- The words of the user in one block, with an update of an earlier handoff in place of a second one.

The fork does not see the results of the tail.
So the prompt names each call of the first reply of the tail, with its input cut at 300 characters.
It asks the fork to mark each of these calls `RAN`, and to state no result for them.

A reply with no value in backticks is not a handoff.
The hook then gives the compaction back to Claude Code.

## The Handoff File

The cold handoff, the path of the file, the source of the status, the ground check, and the update of an earlier handoff are in [Handoff Files](Handoff-Files).

## When the Handoff Fails

The hook gives the compaction back to Claude Code on each of these failures.
Claude Code then does its built-in compaction.

- The fork fails, gives no answer, or gives a text with no value in backticks.
- The model of the session is not known.
- The new context is not below the trigger of the model.
- The file cannot be written, or it is empty after the write.

## Options

| Key | Default | Meaning |
| --- | --- | --- |
| `compaction` | `handoff` | `handoff` writes a handoff. `built-in` leaves each compaction to Claude Code. |

To change it, run `/plugin`, select `claudetto`, select "Configure options", and set "Compaction".
The [Prompt](Prompt) slice reads the same option, so the text about long context agrees with it.

## Bounds

| Bound | Value | Set in |
| --- | --- | --- |
| `HANDOFF_LINES_MAX` | 10 | `slices/handoff/limits.ts` |
| `CALL_INPUT_CHARS_MAX` | 300 | `slices/handoff/limits.ts` |
| `CHARS_PER_TOKEN` | 4 | `slices/handoff/limits.ts` |
| `CACHE_TTL_MS` | 3,600,000 | `slices/handoff/limits.ts` |
| `COLD_FILES_MAX` | 20 | `slices/handoff/limits.ts` |
| `COLD_PROMPTS_MAX` | 3 | `slices/handoff/limits.ts` |
| `COLD_PROMPT_CHARS_MAX` | 1,500 | `slices/handoff/limits.ts` |
| `HANDOFF_TRIGGER_TOKENS` | {{HANDOFF_TRIGGER_TOKENS}} | `src/kernel/budget.ts` |
| `HAIKU_HANDOFF_TRIGGER_TOKENS` | {{HAIKU_HANDOFF_TRIGGER_TOKENS}} | `src/kernel/budget.ts` |

`CHARS_PER_TOKEN` is the estimate of the size of the new context.

## Related Pages

- [Ground](Ground): the check of quoted values.
- [Prompt](Prompt): the text about long context.
- [Settings Snippet](Settings-Snippet): the keys that set the trigger.
- [Off Switches](Off-Switches): the ways to turn a part off.
