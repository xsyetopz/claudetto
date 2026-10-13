# You Should Know

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

## When It Checks

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

In a TUI session, the toast showed 23 ms before Claude Code wrote the file.
So the notice shows before the action that it is about.

## What a Check Costs

The plugin makes at most one model call per turn.
The tool waits for the call, so a check adds its wait before the tool runs.

Each check is a separate call to Haiku, with your prompt and the pending action, and no transcript.
The output is one sentence or `NONE`, about 4 to 50 tokens.
The sandbox sessions measured these checks:

| Account | Wait of One Check | Input Tokens of One Check |
| --- | --- | --- |
| Subscription | 2,216 ms and 2,430 ms | 412 of Haiku, against your usage limits |
| API key | 3,017 ms | 411 of Haiku |

The tool waits at most 5 seconds for a separate call and at most 6 seconds for a fork.
Each check sends the newest 10 topics that showed, so the input stays bounded.
A failed or slow call shows no toast, and the change runs.

## When `CLAUDE_CODE_ATTRIBUTION_HEADER` Is `0`

On a subscription, a separate call from a hook gets HTTP 429 when `CLAUDE_CODE_ATTRIBUTION_HEADER` is `0`.
The request then carries no billing block and no identity block of Claude Code, so the API refuses it.

After a 429, the plugin uses a fork of the main conversation for the rest of the session.
A fork sends the main request again, so it works.
The fork has no output bound and no cancel.
`$.model.fork` takes only `{ prompt }`, so the plugin cannot set a token limit or a timeout on it.
The plugin stops waiting after 6 seconds, but it cannot stop the request.
The sandbox session measured this path:

- The first check waited 2,850 ms, because Claude Code tried the separate call 3 times before the 429 stood.
- The fork read 16,731 input tokens on the main model, nearly all of them a cache read of the conversation.

So a fork costs much more than a separate call.
Keep the attribution header on to get the cheaper check.
The core plugin does not set `CLAUDE_CODE_ATTRIBUTION_HEADER=0`.

## Limits

- The toast is for you only, and Claude does not see it.
- The cost of a session does not show the cost of its checks, because the cache state of the main requests differs between runs.
- Each number above comes from one or two sandbox sessions with `claude-sonnet-5-5` and one short edit.

The evidence is in `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md`.

## Related Pages

- [AGENTS.md](Agents-Md): the other plugin that replaces a built-in plugin.
- [Add-On Plugins](Add-Ons): the list of the add-on plugins.
