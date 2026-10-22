# Handoff

Claude Code compacts the main thread when the context gets long.
The built-in compaction writes a summary.
The `handoff` slice of `claudetto` writes a handoff in its place.
A handoff is a short note with the task, the steps that are done, and the next step.
The new context starts from the note, so long work does not lose its place.

## What You Get

After a handoff, the context holds two parts:

1. One user message.
   It has the first user message of the session and the handoff.
2. The tail: the newest messages.
   The tail starts at the first message of the last reply that has a tool use.

An image or an attachment of the first user message does not stay.
The tail keeps each newest tool call with its result, so the model does not run a step again.
If the last message is a reply with no tool use, the turn has ended and there is no tail.

The handoff also goes to a file.
The user message names the file, so you and the model can read it again.

## The Hooks

| Hook | What it does |
| --- | --- |
| `session.compact` | Writes the handoff and gives the new context in place of the summary. |
| `turn.complete` | Notes the time when a turn of the main thread ends. |
| `turn.step` | Notes the time of each model request of the main thread. |
| `PreModelSwitch` (a classic hook) | Says nothing when the cache is cold. When the cache is warm, it asks you and names the cost of the cache write that a `/model` switch causes. |

The `session.compact` hook runs for the triggers `auto`, `manual`, and `plugin`.
A compaction of a subagent passes on with no change.

## When It Runs

The settings snippet sets the point where auto compaction starts.
That point is below the size where Claude Code blocks a request with "Prompt is too long".

| Model family | Auto compaction starts at |
| --- | --- |
| Opus, Sonnet, and Fable | {{HANDOFF_TRIGGER_TOKENS}} tokens of a {{CONTEXT_WINDOW}}-token window |
| Haiku | {{HAIKU_HANDOFF_TRIGGER_TOKENS}} tokens |

The snippet sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `autoCompactWindow` for this.
It sets a window for `claude-haiku-5-5` with `modelSettings`.
The same size limits the new context.
If the new context is not below the trigger of the session model, the handoff does not run.
See [When the Handoff Fails](#when-the-handoff-fails) and [Settings Snippet](Settings-Snippet).

## How the Handoff Is Written

The prompt cache decides how the hook writes the handoff.
The cache is a store that makes repeated input cheap.
The hook takes the cache as cold when no turn or model request of the main thread ended in the last hour.
It also takes it as cold when it has seen no request in this process, such as after `--resume`.
If the clock fails, the hook takes the cache as warm.

| Cache | Mode | Cost |
| --- | --- | --- |
| Warm | A fork of the session writes the handoff. | One model request, mostly read from the cache. |
| Cold | The hook writes the handoff from the messages. | No model call. |

On a cold cache, a fork would read the full history as uncached input.
That is why the hook does not use a fork then.

The settings snippet sets `CLAUDE_CODE_PROMPT_CACHE_TTL` to `1h`, so the main thread keeps a 1-hour cache.
Claude Code bills a 1-hour cache write at a higher rate.
Each model request of the main thread renews the cache time, so a long turn stays warm.
A subagent keeps the 5-minute default, and its requests do not renew the time.

On a terminal, the status line shows `Writing the handoff…` while the hook works.
A notice then names the file and its size.
In `-p` mode the hooks draw nothing.

## The Warm Handoff

The prompt of the fork asks for a Markdown list of 10 lines or less.
The list must hold:

- The task, each step that is done, and the next step.
- Each exact value with its label, in backticks.
- The exact text of each error, in backticks.
- Your words in one block, with an update of an earlier handoff in place of a second one.

The fork does not see the results of the tail.
So the prompt names each call of the first reply of the tail, with its input cut at 300 characters.
The fork must mark each of these calls `RAN` and state no result for them.

A reply with no value in backticks is not a handoff.
The hook then gives the compaction back to Claude Code.

## The Handoff File

[Handoff Files](Handoff-Files) tells about:

- the cold handoff
- the path of the file
- the source of the status
- the ground check
- the update of an earlier handoff

## When the Handoff Fails

The hook gives the compaction back to Claude Code when:

- The fork fails, gives no answer, or gives a text with no value in backticks.
- The model of the session is not known.
- The new context is not below the trigger of the model.
- The file cannot be written, or it is empty after the write.

Claude Code then does its built-in compaction.

## How to Turn It Off

| Key | Default | Meaning |
| --- | --- | --- |
| `compaction` | `handoff` | `handoff` writes a handoff. `built-in` leaves each compaction to Claude Code. |

To change it, run `/plugin`, select `claudetto`, select "Configure options", and set "Compaction".
The [Prompt](Prompt) slice reads the same option.

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
| `HANDOFF_TRIGGER_TOKENS` | {{HANDOFF_TRIGGER_TOKENS}} | `plugins/claudetto/kernel/budget.ts` |
| `HAIKU_HANDOFF_TRIGGER_TOKENS` | {{HAIKU_HANDOFF_TRIGGER_TOKENS}} | `plugins/claudetto/kernel/budget.ts` |

## Related Pages

- [Handoff Files](Handoff-Files)
- [Ground](Ground)
- [Prompt](Prompt)
- [Settings Snippet](Settings-Snippet)
- [Off Switches](Off-Switches)
