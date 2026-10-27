# Handoff

A long session costs more with each turn, and Claude Code compacts the main thread when the context gets long.
The built-in compaction writes a summary.
The `handoff` slice of `claudetto` hands over in its place at three triggers: a handoff file, then `/clear`, then a resume.
A handoff is a short note with the task, the steps that are done, and the next step.
The new context starts from the note, so long work does not lose its place.
The slice has no hook on the compaction of Claude Code.

## The Handover

A handover is a handoff, then `/clear`, then a resume.
The hook writes the handoff file with no model call, keeps the resume prompt in `$.state`, and queues `/clear` with `$.command.run` without awaiting it, because its promise need not settle when the session is reset. The `classic.SessionStart` hook with `source` `clear` takes the resume prompt and sends it as the first user turn of the new session with `$.prompt.submit`. A handover that no new session takes ends after 60 seconds.
The old session stays on disk, and `/resume` opens it.
A handover starts only at the end of a turn with no running agent and no running background task.

| Trigger | When | Question |
| --- | --- | --- |
| Context | The context passes 150,000 tokens. | None. |
| Cold cache | The user sends a prompt after a pause longer than the cache TTL. | The note offers the handover, and it runs only on the yes. The prompt runs after the resume. |
| Task group | The open change moves to its next task group, or the session is older than 8 hours. | None. |

With a Jev key, Jev answers the offer of the cold cache case from the size of the context, the idle time, and the open task.
A `P(yes)` of 0.7 or more is a yes, and 0.3 or less is a no.
You see the dialog only when Jev is not sure.
Each handoff also holds a cost line: the cost of the session and the change of each plan share since the first reading.

`PATH_TABLE` in `plugins/claudetto/modules/session/handoff/limits.ts` maps each case to `handover`, `compact`, or `handoff-then-compact`.
Its first values are `handover` for each case, and the paired runs of task 11.6 set the final values.
The automatic compaction of Claude Code stays as the safety net.

Each row also has a `model`: the alias or full ID of the first request step after a handover, or `null` for the session model.
Its first value is `null` for each case, and the paired runs of task 11.7 set the final values.
Only the first step of the main thread after the resume gets it, and the later steps keep the session model.

## The Hooks

| Hook | What it does |
| --- | --- |
| `turn.complete` | Notes the time when a turn of the main thread ends. |
| `classic.Stop` | Starts a handover for the context and task group triggers at a quiet turn end. |
| `prompt.submit` | Offers a handover after a pause longer than the cache TTL, and holds the prompt for the answer. |
| `turn.step` | Notes the time of each model request of the main thread, and sets the model of the first step after a handover from the table. |
| `PreModelSwitch` (a classic hook) | Says nothing when the cache is cold. When the cache is warm, it asks you and names the cost of the cache write that a `/model` switch causes. |

## When It Runs

The settings snippet sets the point where auto compaction starts.
That point is below the size where Claude Code blocks a request with "Prompt is too long".

| Model family | Auto compaction starts at |
| --- | --- |
| Opus, Sonnet, and Fable | {{HANDOFF_TRIGGER_TOKENS}} tokens of a {{CONTEXT_WINDOW}}-token window |
| Haiku | {{HAIKU_HANDOFF_TRIGGER_TOKENS}} tokens |

The snippet sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `autoCompactWindow` for this.
It sets a window for `claude-haiku-5-5` with `modelSettings`.
This compaction stays on as the safety net, and `claudetto` has no hook on it.
See [Settings Snippet](Settings-Snippet).

## The Handoff File

[Handoff Files](Handoff-Files) tells about:

- the path of the file
- the source of the status
- the update of an earlier handoff

## How to Turn It Off

| Key | Default | Meaning |
| --- | --- | --- |
| `compaction` | `auto` | `auto` picks the path of each case from the table. `handover` hands over at each trigger. `built-in` starts no path of `claudetto` and leaves each compaction to Claude Code. |

To change it, run `/plugin`, select `claudetto`, select "Configure options", and set "Compaction".
The [Prompt](Prompt) slice reads the same option.

## Bounds

| Bound | Value | Set in |
| --- | --- | --- |
| `CHARS_PER_TOKEN` | 4 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `CACHE_TTL_MS` | 3,600,000 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `HANDOVER_CONTEXT_TOKENS` | 150,000 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `HANDOVER_AGE_MS` | 28,800,000 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `RULES_TOKENS` | 2,500 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `VALUES_TOKENS` | 800 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `DECISIONS_TOKENS` | 1,000 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `USER_VALUE_CHARS_MAX` | 200 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `EDITED_TOKENS` | 1,500 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `READS_TOKENS` | 4,500 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `COLD_PROMPTS_MAX` | 3 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `COLD_PROMPT_CHARS_MAX` | 1,500 | `plugins/claudetto/modules/session/handoff/limits.ts` |
| `HANDOFF_TRIGGER_TOKENS` | {{HANDOFF_TRIGGER_TOKENS}} | `plugins/claudetto/modules/session/limits.ts` |
| `HAIKU_HANDOFF_TRIGGER_TOKENS` | {{HAIKU_HANDOFF_TRIGGER_TOKENS}} | `plugins/claudetto/modules/session/limits.ts` |

## Related Pages

- [Handoff Files](Handoff-Files)
- [Ground](Ground)
- [Prompt](Prompt)
- [Settings Snippet](Settings-Snippet)
- [Off Switches](Off-Switches)
