# Second opinion

The `dotclaude-jev` plugin lets Claude get a calibrated second opinion from TypeSafe Jev on a close call.
Jev is a decision model.
It writes no text or code, and it gives probabilities.

## At a glance

| Item | Value |
| --- | --- |
| Install | `/plugin install dotclaude-jev@dotclaude`, with `TYPESAFE_API_KEY` exported before Claude Code starts |
| Skills and bins | None |
| Tool | `second_opinion`, registered only when the key is set |
| Hooks | One module with `session.start` and `tool.call` handlers ([Hooks](Hooks#dotclaude-jev)) |
| Options | None. The plugin has no `userConfig`. The only input is the environment variable `TYPESAFE_API_KEY` |
| Limits | See [Cost and limits](#cost-and-limits) |
| Problems | See [Troubleshooting](#troubleshooting) |

## Before you begin

1. Install [Bun](https://bun.sh) 1.4.3 or later.
2. Get an API key at <https://console.typesafe.ai>.
3. Export the key before Claude Code starts.

   ```bash
   export TYPESAFE_API_KEY=<your key>
   ```

4. Add the `dotclaude-jev` plugin from the dotclaude marketplace.

> **Warning:** The tool sends the question and the state to the TypeSafe API.
> Do not put secrets, credentials, or personal data in them.

## What it does

The plugin has no skill and no `SessionStart` note.
Its hooks module (`hooks/register.ts`) registers two parts.

| Part | What it does |
| --- | --- |
| `second_opinion` tool | Claude sees it as `mcp__dotclaude-jev__second_opinion`. A call asks Jev for a yes or no check, or for a pick among 2 or more options. |
| `AskUserQuestion` hook | Asks Jev about each question that has 2 or more options, and adds the pick of Jev to a question that facts decide. |

Jev does not answer for you.
Claude asks you the questions about goals, preferences, and approvals, and the hook does not change them.

## The tool

The hooks module registers the tool at `session.start` with `$.tool.register`.
A `tool.call` hook serves each call.

| State | The tool is |
| --- | --- |
| `TYPESAFE_API_KEY` is set | Registered and loaded. The description tells Claude to use the tool for a close call or a technical choice, and when you ask for a second opinion. |
| `TYPESAFE_API_KEY` is not set | Not registered. Claude does not see the tool, so it costs no tokens. |

The description carries these rules, which replace the old session note.

- Facts decide some questions, and you decide others.
  Claude asks you, and not the tool, about goals, preferences, and approvals.
- When Claude does not follow the pick of Jev, it tells you and gives the reason.

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

The hooks module runs the Jev client (`features/jev/cli.ts`) as a child process with `$.process.run`, because the client imports `node:` modules.
The key goes in the environment of the child and never in the argument list.
The output gives the probability of each answer and a confidence from 0 to 1.
A confidence under 0.5 means that Jev is not sure.
The text of an error reply that goes to Claude is cut to 200 characters (`ERROR_BODY_MAX` in `features/jev/limits.ts`).

### The fallback result

When Jev fails or takes more than 45 seconds, the result has no pick of Jev.
It names the reason once and tells Claude to do this:

1. Answer from its own check of the evidence.
2. Tell you that no second opinion was available.

The result says that another call for this question is unlikely to help.
No model answers in the tool, so no check ran there.

## The hook

1. Claude asks a question with options through `AskUserQuestion`.
2. The hook runs the client with `ask` once.
   Jev sorts each question into `preference` or `facts`, and picks an option.
3. For a `facts` question, the hook adds a line to the question, such as `Jev picks "<option>" (confidence 0.82).`
   It adds the line only when the confidence for the kind and for the pick is 0.5 or more.
4. You answer the question as usual.
   The question always comes to you, also when Jev is sure, because Jev does not answer for you.

The hook never denies a call.
It runs only when the key is set.
Without `TYPESAFE_API_KEY`, or when Jev fails or takes more than 45 seconds, the question passes unchanged.

## Cost and limits

| Item | Value |
| --- | --- |
| Price | $0.042 for each million input tokens |
| Size of a call | Up to 64,000 tokens |
| Time for a call | 45 seconds, the kill bound of the hooks module |
| Tries of one call | 3, with a wait of 1 second and then 2 seconds |

The timeout of one try is derived in `features/jev/limits.ts`.
The tries, their timeouts, the waits, and a margin of 2 seconds always add up to less than the kill bound.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Claude has no `second_opinion` tool | The key is not in the environment of Claude Code. | Export the key, and restart Claude Code. |
| The result says `TypeSafe API 401` | The key is not valid. | Get a new key. |
| The result says the input is not valid | `question` is empty, or an option has no `key` or a `key` with `=`. | None. Claude corrects the call. |
| No pick on a question | The question has fewer than 2 options, is a preference, or has confidence under 0.5. | None. |

## Related pages

- [Install](Install)
- [Hooks](Hooks#dotclaude-jev)
- [Troubleshooting](Troubleshooting#dotclaude-jev)
