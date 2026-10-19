# Handoff

This page tells how the handoff of `claudetto` replaces the compaction of Claude Code.
It is for a user of the core plugin who wants to know what stays in the context after a compaction,
and how to turn the handoff off.

## What the Handoff Does

When Claude Code compacts the main thread, the built-in compaction writes a summary of the session.
The handoff of `claudetto` replaces that summary.
After a handoff, the context holds 2 parts:

1. One user message with the text of the first user message of the session,
   and the handoff: the goal, the state of the work, the done steps, and the next step.
2. The tail: the newest messages, from the first message of the last reply with a tool use to the end.

An image or an attachment of the first user message does not stay.

The handoff text ends with 2 kept parts, which `claudetto` writes from the messages and not from the model:

- The last 3 prompts of the user, word for word, after the first prompt.
  Each prompt is cut at 1,500 characters.
- The files that the session changed with `Write`, `Edit`, `MultiEdit`, or `NotebookEdit`, at most 20, in the order of the last change.

So a correction of the user in a late prompt and the list of the changed files do not depend on the summary of the model.

The tail keeps each newest tool call with its result, so the model does not run a done step again.
The fork does not see the results of the tail, so the handoff marks each tail call `RAN`, not `DONE`, and states no result for it.
When the last reply has no tool use, the turn has ended, and there is no tail.

The handoff is also a file in `.claudetto/handoffs/`, with a name such as `handoff-20261016T120000Z.md`.
The handoff message names the file, so you and the model can read it again.

When a [MiniSpec](MiniSpec) change has an open task, the handoff goes to `minispec/changes/<name>/handoff.md` in its place.
It names the change folder and the next open task.

## When It Runs

The handoff runs for each compaction of the main thread with the trigger `auto` or `manual`.
A compaction of a subagent stays as built in.

`claudetto` sets the trigger of the auto compaction with a safety margin:

| Model family | Trigger |
| --- | --- |
| Opus, Sonnet, and Fable | at or below 225,000 tokens of a 300,000-token window |
| Haiku | at or below 100,000 tokens |

The handoff then runs before a long turn fills the context,
so no request stops with "Prompt is too long".
The [settings snippet](Settings-Snippet) has the keys that set the trigger.

## How It Writes the Handoff

A fork of the session writes the handoff.
The fork reads the conversation from the prompt cache, so it costs less than a new request.

After `--resume`, there is no cache to fork.
Then a `haiku` completion writes the handoff from a digest of the messages of at most 15,000 tokens.

When the new context is not below the trigger, the handoff cuts the tail.

## A Cold Cache

The fork reads the conversation from the prompt cache.
After the cache TTL, the cache is cold, and a fork reads the full history as uncached input.
So the handoff of a cold compaction needs no model call.
It holds the task, the next open task of `tasks.md`, the done tasks (the checked tasks of `tasks.md`), the changed files, and the last words of the user.

The TTL of a root session is 1 hour.
A subagent compaction goes to the built-in compaction, so its 5-minute TTL does not matter here.
`claudetto` sets `CLAUDE_CODE_PROMPT_CACHE_TTL` to `1h` in the settings snippet, so the main conversation keeps a 1-hour cache.
Claude Code bills a 1-hour cache write at a higher rate.
Each model request of the main thread, and the end of each turn, renews the time of the cache, so a long turn stays warm.
When the hook has seen no request in this process, such as after `--resume`, it takes the cache as cold.

## The Status Comes from Checks

The done list of a handoff is the list of the checked tasks of `tasks.md`.
The handoff takes each `DONE` mark off the text of the model, so the model text cannot add a done step.

## When the Handoff Fails

The handoff gives the compaction back to Claude Code on each failure.
Claude Code then does its built-in compaction.
These cases are failures:

- The fork or the completion gives no handoff.
- The digest does not fit in 15,000 tokens.
- The cut of the tail does not bring the context below the trigger.
- The file cannot be written, or it is empty after the write.

## Turn the Handoff Off

Set the plugin option `compaction` to `built-in`:

1. Run `/plugin`, and select `claudetto`.
2. Select "Configure options".
3. Set "Compaction" to `built-in`.

With `built-in`, each compaction stays as built in.
The default is `handoff`.

## Managed Machines

On a machine that Claude Code manages,
Claude Code gives the compaction hook only to the plugins in the managed `appendPlugins` list.
A machine is managed when it has managed settings, a managed MCP file, or a Team or Enterprise login.

When `claudetto` is not in that list, the handoff of a compaction is off.
At session start, `claudetto` shows one notice that gives the managed entries that turn it on:

```json
{
  "appendPlugins": ["claudetto@claudetto"],
  "enabledPlugins": { "claudetto@claudetto": true }
}
```

`/handoff-setup` shows the steps that add these entries.
It shows the new content of the managed settings file, with each key of the current file kept,
and one `! sudo` command that writes it.
When no managed settings file exists, it first gives a warning:
a new file turns on the built-in guard of Claude Code,
so each plugin that is not in `appendPlugins` loses the compaction hook.
When an organization manages Claude Code, it gives no command and tells you to ask the admin.
An organization manages Claude Code when the login is Team or Enterprise, an MDM profile exists,
or the managed settings have a key that the file does not have.

`claudetto` cannot see a managed MCP file, so in that case it shows no notice.

## Cost

In the evals of `claudetto`, a handoff costs less than a built-in compaction.
A completion on the digest costs about 0.0016 USD with `haiku`, against 0.0039 USD for the built-in compaction of the same session.
After a handoff, the session keeps the facts that the next steps need, such as the first line of a file that it read and a code word.
