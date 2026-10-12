# Second opinion

The core plugin `dotclaude` gives Claude a calibrated second opinion, the `second_opinion` tool, on a close call.
The tool asks TypeSafe Jev, a decision model.
Jev writes no text or code, and it gives probabilities.

## At a glance

| Item | Value |
| --- | --- |
| Install | Part of `/plugin install dotclaude@dotclaude`. Export `TYPESAFE_API_KEY` before Claude Code starts. |
| Skills | None |
| Bin | `dotclaude-decide` in `bin/`, which runs on Bun |
| Tool | `second_opinion`, registered at each session start, with or without the key |
| Hooks | The core hooks module: `session.start` registers the tool, `tool.call` serves each call, and an `AskUserQuestion` hook adds a pick ([Hooks](Hooks)) |
| Options | None. The only input is the environment variable `TYPESAFE_API_KEY` |
| Limits | See [Cost and limits](#cost-and-limits) |
| Problems | See [Troubleshooting](#troubleshooting) |

## Before you begin

1. Install [Bun](https://bun.sh) 1.4.3 or later, so that `bun` is on `PATH`.
2. Get an API key at <https://console.typesafe.ai>.
3. Export the key before Claude Code starts.

   ```bash
   export TYPESAFE_API_KEY=<your key>
   ```

> **Warning:** The tool sends the question and the state to the TypeSafe API.
> Do not put secrets, credentials, or personal data in them.

## What it does

The `decide` slice of the core plugin (`slices/decide/`) registers two parts.

| Part | What it does |
| --- | --- |
| `second_opinion` tool | Claude sees it as `mcp__dotclaude__second_opinion`. A call asks Jev for a yes or no check, or for a pick among 2 or more options. |
| `AskUserQuestion` hook | Asks Jev about each question that has 2 or more options, and adds the pick of Jev to a question that facts decide. It runs only when the key is set. |

Jev does not answer for you.
Claude asks you the questions about goals, preferences, and approvals, and the hook does not change them.

## The tool

The tool is registered at `session.start` with `$.tool.register`, with or without the key.
A `tool.call` hook serves each call.
Without the key, Jev is not tried, and a small Claude model answers instead (see [The fallback result](#the-fallback-result)).

The description carries these rules.

- Facts decide some questions, and you decide others.
  Claude asks you, and not the tool, about goals, preferences, and approvals.
- When Claude does not follow the pick of Jev, it tells you and gives the reason.

### The question stays neutral

Claude gives the decision, every option, and for each option at least one fact for it and one fact against it.
It gives no preferred answer and no leading words.
It leaves out a lean or a preference of the user, the notes, or the team, because Jev judges the facts only.
Before the tool asks Jev, it puts the options in a random order (a Fisher-Yates shuffle), so the order of the list does not lead the pick.

### Input

| Field | Meaning |
| --- | --- |
| `question` | The decision, as a neutral question. Required. |
| `options` | 2 to 255 options, each with a `key` and a `description`. Leave it out for a yes or no question. The `key` has no `=` character. |
| `state` | The facts that the decision depends on, such as a diff, a log, or a plan. |

The hooks module runs the CLI `dotclaude-decide` (`slices/decide/adapters/cli.ts`) as a child process with `$.process.run`, through `bun --no-env-file`.
The key goes in the environment of the child and never in the argument list.
The output gives the probability of each answer and a confidence from 0 to 1.
A confidence under 0.5 means that Jev is not sure.
The text of an error reply that goes to Claude is cut to 200 characters (`ERROR_BODY_MAX` in `slices/decide/limits.ts`).

### The fallback result

When no key is set, when Jev fails, or when Jev takes more than 45 seconds, a small Claude model (`haiku`) answers through `$.model.complete`.
The result names the reason that Jev gave no answer.
It says that the answer is not from Jev, and it tells Claude to tell you that the answer is from a Claude model.
If that model also gives no answer, the result tells Claude to answer from its own check of the evidence, and to tell you that no second opinion was available.

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

The timeout of one try is derived in `slices/decide/limits.ts`.
The tries, their timeouts, the waits, and a margin of 2 seconds always add up to less than the kill bound.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| The result says the variable `TYPESAFE_API_KEY` is not set | The key is not in the environment of Claude Code. | Export the key, and restart Claude Code. |
| The result says the key is not valid | The key is not valid. | Get a new key. |
| The result says the TypeSafe account has no balance | The account has no balance. | Add balance to the account. |
| The result says the input is not valid | `question` is empty, or an option has no `key` or a `key` with `=`. | None. Claude corrects the call. |
| No pick on a question | The question has fewer than 2 options, is a preference, or has confidence under 0.5. | None. |

## Related pages

- [Install](Install)
- [Hooks](Hooks)
- [Troubleshooting](Troubleshooting)
