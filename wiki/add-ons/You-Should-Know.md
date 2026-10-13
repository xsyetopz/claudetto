# You should know

The plugin `dcc-plugin-you-should-know` shows one thing that you should know before Claude changes something.
It shows the thing as a toast, and the change runs as usual.
It replaces the built-in plugin `cc-plugin-you-should-know`, which shows its notice after Claude acts.
It works without the core plugin, and it imports nothing from another plugin.

The plugin is opt-in.
The setup of dotclaude does not turn it on, because each check costs a model call.

The source is in `src/plugins/dcc-plugin-you-should-know/`.
The one slice is `notice`, and its hooks are in `slices/notice/adapters/mod.ts`.

## Install

1. Install the plugin with `/plugin install dcc-plugin-you-should-know@dotclaude`.
2. Turn off the built-in plugin `cc-plugin-you-should-know@builtin` in `/plugin`.

## When it checks

The plugin checks the first call of each turn that changes something:
an `Edit`, a `Write`, a `NotebookEdit`, or a `Bash` command that is not a read.

These calls get no check:

- a read, such as `Read` or `cat a.txt`
- the second and each later changing call of the same turn
- a call of a subagent
- a call that the permission rules deny

The model gives one topic of three kinds, or none:
a trade-off that you possibly do not see, a design decision that has effects later, or an edge case that is not clear.
Most checks give none, and then no toast shows.
A topic that showed in the session does not show again.

## What a check costs

The plugin makes at most one model call per turn.
The tool waits for the call, so a check adds its wait before the tool runs.

| Account | Model call | Cost of one check | Wait |
| --- | --- | --- | --- |
| API key | A separate call to Haiku, with your prompt and the pending action, and no transcript | At most about 2,400 tokens of Haiku | About 1 second, at most 5 seconds |
| Subscription | A fork of the main conversation, on the main model | The conversation as a cache read, plus the prompt and the answer, against your usage limits | About 1 second, at most 6 seconds |

A subscription gets HTTP 429 on a separate call from a hook.
So the plugin tries the separate call first, and after a 429 it uses a fork for the rest of the session.
The first check of a session on a subscription waits for the 429, about 2.5 seconds.
When Claude Code lets a subscription make separate calls from a hook, the separate call works on a subscription too.

A failed or slow call shows no toast, and the change runs.

## Limits

- The toast is for you only, and Claude does not see it.
- The cost and the wait of one real check on each account are not measured yet.
  The numbers above come from the bounds of the plugin and from probes with a short prompt.

The evidence is in `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md`.
