# Second opinion

The `dotclaude-jev` plugin lets Claude get a calibrated second opinion from TypeSafe Jev on a close call.
Jev is a decision model.
It writes no text or code, and it gives probabilities.

## Before you begin

1. Install [Node.js](https://nodejs.org) 22.18 or later.
1. Get an API key at <https://console.typesafe.ai>.
1. Export the key before Claude Code starts.

   ```bash
   export TYPESAFE_API_KEY=<your key>
   ```

1. Add the `dotclaude-jev` plugin from the dotclaude marketplace.

> **Warning:** The tool sends the question and the state to the TypeSafe API.
> Do not put secrets, credentials, or personal data in them.

## What it does

The plugin has no skill and no `SessionStart` note.
Its hooks module (`hooks/register.mjs`) registers two parts.

| Part | What it does |
| --- | --- |
| `second_opinion` tool | Claude sees it as `mcp__dotclaude-jev__second_opinion`. A call asks Jev for a yes or no check, or for a pick among 2 or more options. |
| `AskUserQuestion` hook | Asks Jev about each question that has 2 or more options, and adds the pick of Jev to a question that facts decide. |

Jev does not answer for you.
Claude asks you the questions about goals, preferences, and approvals, and the hook does not change them.

## The tool

The hooks module registers the tool at `session.start` with `$.tool.register`.
A `tool.call` hook serves each call.

| State | The tool is | The description tells Claude |
| --- | --- | --- |
| `TYPESAFE_API_KEY` is set | Loaded | To ask for a second opinion on a close call, a technical choice, a decision or an answer of yours, and each request for one. |
| `TYPESAFE_API_KEY` is not set | Deferred | To use it only for a decision that is hard to undo, such as a data migration, a public API change, or a security setting. A call gets the fallback result. |

A deferred tool costs about 10 tokens in the deferred list, so Claude pays for the full description only when it loads the tool.
Both descriptions carry the same rules, which replace the old session note.

- Facts decide some questions, and you decide others.
  Claude asks you, and not the tool, about goals, preferences, and approvals.
- When Jev picks an answer with a confidence of 0.9 or more for a question that facts decide, Claude does not ask you that question unless you ask for it.
- When Claude does not follow the pick of Jev, it says so and gives the reason.

### The question stays neutral

Claude gives the decision, every option, and for each option at least one fact for it and one fact against it.
It gives no preferred answer and no leading words.
It leaves out a lean or a preference of the user, the notes, or the team, because Jev judges the facts only.
In the eval of 2026-10-08, Claude passed on the lean of the project notes in each question, and 2 of 3 questions gave facts for one option only.
Before the tool asks Jev, it puts the options in a random order (a Fisher-Yates shuffle), so the order of the list does not lead the pick.

### Input

| Field | Meaning |
| --- | --- |
| `question` | The decision, as a neutral question. Required. |
| `options` | 2 to 255 options, each with a `key` and a `description`. Leave it out for a yes or no question. The `key` has no `=` character. |
| `state` | The facts that the decision depends on, such as a diff, a log, or a plan. |

The hooks module runs the Jev client (`features/jev/cli.mjs`) as a child process with `$.process.run`, because the client imports `node:` modules.
The key goes in the environment of the child and never in the argument list.
The output gives the probability of each answer and a confidence from 0 to 1.
A confidence under 0.5 is a weak signal.

### The fallback result

With no key, or when Jev fails or takes more than 45 seconds, the result has no pick of Jev.
It names the reason once and tells Claude to do this:

1. Start the `reviewer` agent of `dotclaude` when it is installed, and ask it the same neutral question.
1. Else answer from its own check of the evidence.
1. Do not call the tool again for this question.

No model answers in the tool, so the result says that no check ran there.

## The hook

1. Claude asks a question with options through `AskUserQuestion`.
1. The hook runs the client with `ask` once.
   Jev sorts each question into `preference` or `facts`, and picks an option.
1. For a `facts` question, the hook adds a line to the question, such as `Jev picks "<option>" (confidence 0.82).`
   It adds the line only when the confidence for the kind and for the pick is 0.5 or more.
1. You answer the question as usual.

The hook never denies a call.
It runs only when the key is set.
Without `TYPESAFE_API_KEY`, or when Jev fails or takes more than 45 seconds, the question passes unchanged.

## Cost and limits

| Item | Value |
| --- | --- |
| Price | $0.042 for each million input tokens |
| Size of a call | Up to 64,000 tokens |
| Time for a call | 45 seconds |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| The result says `TYPESAFE_API_KEY` is not set | The key is not in the environment of Claude Code. | Export the key, and restart Claude Code. Claude goes on with the `reviewer` agent. |
| The result says `TypeSafe API 401` | The key is not valid. | Get a new key. |
| The result says the input is not valid | `question` is empty, or an option has no `key` or a `key` with `=`. | None. Claude corrects the call. |
| No pick on a question | The question has fewer than 2 options, is a preference, or has confidence under 0.5. | None. |

## Related pages

- [Install](Install)
- [Guards](Guards)
