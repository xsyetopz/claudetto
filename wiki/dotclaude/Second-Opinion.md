# Second Opinion

This page explains the `second_opinion` tool of the core plugin `dotclaude`.
It is for a user who sets up the tool, and for a contributor who changes the `decide` slice.

The core plugin `dotclaude` gives Claude a second opinion on a close call, with the `second_opinion` tool.
The tool asks TypeSafe Jev, a decision model.
Jev writes no text and no code.
It gives probabilities.
The plugin turns them into a short answer.
The code is in the `decide` slice (`src/plugins/dotclaude/slices/decide/`).

## At a Glance

| Item | Value |
| --- | --- |
| Install | Part of `/plugin install dotclaude@dotclaude`. Export `TYPESAFE_API_KEY` before Claude Code starts. |
| Skills | None |
| Bin | `dotclaude-decide`, which runs on Bun (`adapters/cli.ts`) |
| Tool | `mcp__dotclaude__second_opinion`, registered at each session start, with or without the key |
| Hooks | `session.start` registers the tool. `tool.call` serves the tool. A second `tool.call` adds the pick to `AskUserQuestion`. See [Hooks](Hook-Events). |
| Options | None for the tool. The only input is the environment variable `TYPESAFE_API_KEY`. |

## Before You Start

1. Install [Bun](https://bun.sh) 1.4.3 or later, so that `bun` is on `PATH`.
2. Get an API key from the TypeSafe console.
3. Export the key before Claude Code starts.

   ```bash
   export TYPESAFE_API_KEY=<your key>
   ```

> **Warning:** The tool sends the question and the state to the TypeSafe API.
> Do not put secrets, credentials, or personal data in them.

## What It Does

The slice registers two parts.

| Part | Code | What it does |
| --- | --- | --- |
| `second_opinion` tool | `onSecondOpinion` in `slices/decide/adapters/mod.ts` | Answers a yes or no question, or a pick among options, with Jev. Falls back to a Claude model when Jev gives no answer. |
| `AskUserQuestion` pick | `onAskUserQuestion` in `slices/decide/adapters/ask.ts` | Adds the pick of Jev to each question of facts that has a confident pick. |

The tool name is `TOOL_NAME` in `slices/decide/domain/tool.ts`.
The tool takes a `question`, an optional list of `options`, and an optional `state`.

- With no `options`, the tool gives a yes or no answer.
  The answer gives `P(yes)`.
  A value within `YES_NO_UNSURE_BAND` of 0.5 adds a line that Jev is not sure.
- With `options`, the tool gives a pick.
  The answer gives the chosen key, its confidence, and the probability of each key.
  The keys appear with the most probable first.
  A confidence under `MIN_CONFIDENCE` adds a line that Jev is not sure.

The options are checked in `domain/request.ts`.
A pick needs `MIN_OPTIONS` to `MAX_OPTIONS` options, each with a `key`.
The options go to Jev in a random order (`shuffled` in `domain/picks.ts`).
So the position of an option does not decide the pick.

### AskUserQuestion

The `AskUserQuestion` hook sends each question with two or more options to Jev.
It skips a question with one option.
It also skips a question with several choices.
Jev first classifies each question by its kind.
For a question of facts, Jev gives a pick.
The pick goes into the question as the picked option.
When Jev gives no answer, the question stays as Claude sent it.

## Routes

`route` in `slices/decide/domain/route.ts` decides which provider answers.

1. Jev answers when the variable `TYPESAFE_API_KEY` is set.
2. The fallback answers when Jev gives no answer.
   The cause of the Jev failure goes into the result, so the answer names it.

The fallback is a Claude model, `FALLBACK_MODEL`, which is `haiku`.
It runs through `$.model.complete` in `slices/decide/adapters/fallback.ts`.
Its answer is not from Jev.
The result text says so.

The causes of a failure are these:

| Cause | Source |
| --- | --- |
| `no-key` | The variable `TYPESAFE_API_KEY` is not set. |
| `invalid-key` | The CLI exits with code 3, which is HTTP 401. |
| `no-balance` | The CLI exits with code 4, which is HTTP 402. |
| `usage` | The CLI exits with code 2. |
| `failed` | Any other failure. |

The mapping of code 4 to `no-balance` is not verified against the TypeSafe API.
The comment of `causeOfExit` in `domain/route.ts` says that it is a decision of the project.

## Cost and Limits

The bounds are in `slices/decide/limits.ts`.
A test pins that the attempts and the waits fit in the whole run.

| Bound | Value | Use |
| --- | --- | --- |
| `JEV_TIMEOUT_MS` | 45000 | The whole run of Jev, in milliseconds. |
| `ATTEMPT_TIMEOUT_MS` | 12000 | One attempt of the TypeSafe client. |
| `TRIES` | 3 | The attempts of one call. The client retries HTTP 429 and 529 (`adapters/cli.ts`). |
| `BACKOFF_MS` | 1000 | The wait between two attempts. |
| `FALLBACK_TIMEOUT_MS` | 30000 | The run of the fallback model. |
| `FALLBACK_MAX_TOKENS` | 512 | The output tokens of the fallback model. |
| `MIN_OPTIONS` and `MAX_OPTIONS` | 2 and 255 | The options of a pick. |
| `MIN_CONFIDENCE` | 0.5 | The confidence below which the answer says that Jev is not sure. |
| `YES_NO_UNSURE_BAND` | 0.2 | The band around 0.5 in which a yes or no answer says that Jev is not sure. |

The model of the API is `jev-latest`.
The endpoint is `https://api.typesafe.ai/v1/systemone`.
The file `slices/decide/adapters/cli.ts` sets both values.

## Exit Codes

The `dotclaude-decide` command exits with these codes (`EXIT` in `adapters/cli.ts`):

| Code | Meaning |
| --- | --- |
| 0 | The answer is printed. |
| 1 | A failure. |
| 2 | A fault of the arguments. |
| 3 | The key is not valid. |
| 4 | The account has no balance. This mapping is not verified. |

## Troubleshooting

- The tool answers with the fallback, and the text names `no-key`.
  Export `TYPESAFE_API_KEY` before Claude Code starts.
  Then start a new session.
- The tool answers with `invalid-key`.
  Check the key in the console.
- The tool answers with `no-balance`.
  Check the balance of the account.
  The mapping of this cause is not verified.
  So the account may have another fault.

## Tests

- `tests/dotclaude/decide/` checks the routes, the texts, and the `AskUserQuestion` rules.
- `slices/decide/lab/second-opinion.test.ts` and `slices/decide/lab/session.test.ts` run the hook lab.
- The key never goes into the argument list, a log, or a test.
  `adapters/cli.ts` reads the key from the environment only.

## Related Pages

- [Hooks](Hook-Events): the hooks of the core plugin.
- [Prompt Surface](Prompt-Surface): the text that the plugin adds to the prompt.
- [Decisions](Decisions): the choices behind the tool.
