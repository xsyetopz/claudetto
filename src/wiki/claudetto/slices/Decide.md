# Decide

The `decide` slice lets Jev answer the questions that Claude asks you.
Jev is a model of the TypeSafe API.
When Jev is sure, you see no dialog.

## What It Does for You

Claude asks a question with `AskUserQuestion`.
The slice sends each question of the call to Jev, whatever its kind.
When Jev is sure about each question, the pick of Jev is the answer, and the dialog does not show.
Claude gets the answer with a note that names Jev, the pick, and the confidence, and its next reply tells you.
When Jev is not sure about one question, you see the normal dialog.
The option that Jev picked has the note `Jev picks this option (confidence N).` in its description.

## How to Turn It On or Off

The option `decide` has two values:

| Value | Effect |
| --- | --- |
| `off` | The plugin sends no request to Jev. |
| `jev` | The default. Jev answers, when `TYPESAFE_API_KEY` is set. The questions go to the TypeSafe API. |

The key `TYPESAFE_API_KEY` in the environment of Claude Code turns Jev on.
If the key is not set, the call passes unchanged and the text of the tool does not change.
Only the value `jev` with a key sends data to the TypeSafe API.

## How the Hook Works

The slice adds a `tool.call` hook on `AskUserQuestion`, in the phase `rewrite`.
One call costs one request to Jev.
The hook does these steps:

1. It sends each question that has 2 or more options and is not multi-select.
   A multi-select question goes to you, because the pick of Jev is one option.
2. It asks Jev for the best option of each such question.
3. It checks each pick: the confidence must be at least `MIN_CONFIDENCE` (0.5) and at least `1 / options + MIN_MARGIN` (0.15), and the pick must be one of the options.
   So a pick of 2 options needs 0.65.
4. When each question of the call has a pick that passes, the hook answers the call with `{ result }`, the way a hook answers in place of the tool.
   The answers are keyed by the question text.
   The `context` of the result names Jev, the pick, and the confidence.
5. Otherwise the dialog shows, with the note of Jev in each option that passed.

The text of the question does not change, because the answers come back with that text as key.
If Jev gives no answer, or the run fails or times out, the dialog shows as Claude asked it.

A second hook, `tool.describe` on `AskUserQuestion`, adds a short text to the tool when Jev is on.
It tells Claude that Jev may answer from the text alone, so Claude puts the facts that decide the question in the question and in the option descriptions.
Jev gets no file on its own.
The picks are as good as those facts.

## The Command

The hook runs the command `claudetto-decide` with Bun.
The key goes in the environment of the process and never in the arguments.
You can also use the command alone:

| Command | Effect |
| --- | --- |
| `claudetto-decide yes "<question>"` | Prints `P(yes)` for a yes or no question. |
| `claudetto-decide pick "<question>" key[=description]...` | Prints the chosen key, the confidence, and the probability of each key. |
| `claudetto-decide ask` | Reads one JSON object on stdin with `questions` and `state`. Prints the answers as JSON. |

`yes` and `pick` take `--state <text>` for facts, `--state -` to read the facts from stdin, and `--json` for a JSON output.
A `--` ends the flags.
The state is text and never a file path, because a path would send a file to the API.
A `pick` question has `MIN_OPTIONS` (2) to `MAX_OPTIONS` (255) options.
The output adds a line when Jev is not sure: a confidence under 0.5 for `pick`, or `P(yes)` within 0.2 of 0.5 for `yes`.

| Exit Code | Meaning |
| --- | --- |
| 0 | An answer. |
| 1 | A failure. |
| 2 | A usage fault, such as a missing key or question. |
| 3 | The key is not valid (status 401). |
| 4 | The account has no balance (status 402). |

When the command fails, the hook leaves the question as Claude asked it.

## Bounds

All bounds are in `slices/decide/limits.ts`.

| Bound | Value |
| --- | --- |
| `JEV_TIMEOUT_MS` | 45,000 ms for the whole run of the hook. |
| `ATTEMPT_TIMEOUT_MS` | 12,000 ms for one try. |
| `TRIES` | 3 tries on a reply of 429 or 529. |
| `BACKOFF_MS` | 1,000 ms before the first retry. Each later wait doubles. |
| `ERROR_BODY_MAX` | 200 characters of an error body. |

## See Also

- [Advise](Advise)
- [Install](Install)
- [Controls](Controls)
- [Bounds](Bounds)
