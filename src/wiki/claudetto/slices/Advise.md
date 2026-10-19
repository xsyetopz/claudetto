# Advise

This page tells how the `advise` slice of the core plugin `claudetto` gives Claude an advisor that the user controls.
A user reads it to choose the advisor, its model, and its effort.
A contributor reads it before an edit of `slices/advise/`.

## The Concept

Claude Code has a built-in advisor.
The `advise` slice offers the tool `advise` in its place.
The user sets the model, the effort, and the bounds of the tool.
The tool asks a stronger model for advice on a hard problem, a plan, or a stuck task.

The slice is off by default.
Then the built-in advisor stays, and the slice registers no tool.

## Options

| Key | Default | Meaning |
| --- | --- | --- |
| `advisor` | `builtin` | `builtin` keeps the advisor of Claude Code. `claudetto` registers the tool `advise`. |
| `advisorModel` | `opus` | The model of the tool: an alias such as `opus`, or a model ID. |
| `advisorEffort` | `high` | The effort of the call: `low`, `medium`, `high`, `xhigh`, or `max`. |

An unknown value gives the default.

With `claudetto`, set `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, so that Claude sees one advisor.
The `setup` slice sets this env var.
See [Setup](Setup).

## Hooks

| Hook | Filter | What it does |
| --- | --- | --- |
| `session.start` | Each start | With `advisor` set to `claudetto`, registers the tool `advise`. The tool is not deferred. |
| `tool.call` | `mcp__claudetto__advise` | Answers a call with one model request. |

## The Tool

The tool has one input, `question`.
Claude says in it what it tried, what failed, and what it needs to know.
The description tells Claude to put no secret in the question.

One call sends a prompt with these parts:

1. The question.
2. The failing checks of the current goal step.
3. The steps of the goal, with the current step marked.
4. The end of the conversation.

The goal comes from `.claudetto/goal.json`.
See [Goal](Goal).
The system prompt tells the model to give advice that Claude can act on: the cause, the next step, and the risk.
The system prompt carries a cache mark, because it stays the same between calls.

The result gives the advice with the model name and the count of tokens in and out.
If the model gives no answer, the result says the cause: an API error, an empty reply, or a call that ended too soon.
An empty question gives an error result.

## Bounds

All bounds are in `slices/advise/limits.ts`.

| Bound | Value | Meaning |
| --- | --- | --- |
| `CONTEXT_BYTES` | 24,000 | The most bytes of context in one call. |
| `MAX_TOKENS` | 2,048 | The token cap of one piece of advice. |
| `TIMEOUT_MS` | 120,000 | The time limit of one call, in ms. |
| `MAX_CALLS_PER_TURN` | 3 | The most calls in one turn. |
| `MAX_CALLS_PER_SESSION` | 20 | The most calls in one session. |

The context is cut in this order: the question, the failing checks, the plan, and then the conversation.
Each part takes what is left of the bound.
The conversation keeps its newest lines.
A turn starts at the last user message with text.
A `/compact` keeps the session id, so it does not reset the count of calls.
A call over a limit gets a result that tells Claude to go on or to ask the user.

## Cost

With `builtin`, the slice costs nothing.
With `claudetto`, each call is one model request.

## Related Pages

- [Goal](Goal)
- [Decide](Decide)
- [Setup](Setup)
- [Bounds](Bounds)
