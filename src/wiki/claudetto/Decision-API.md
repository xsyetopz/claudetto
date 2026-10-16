# Decision API

This page describes the opt-in decision API of the core plugin `claudetto`.
It is for a user who wants Claude to settle a choice with a second opinion, and for a contributor who edits the `decide` slice.

## What It Does

Claude calls the tool `second_opinion` with a question, the facts, and two or more options.
The tool gives one option key and a confidence from 0 to 1.
A choice that the facts can settle then does not go to the user.

Two options with the same key give an input error.
The call makes no request in that case.

## It Is Off by Default

The plugin option `decide` has 3 values:

| Value | Effect |
| --- | --- |
| `off` | The default. The plugin registers no tool, makes no model call, and sends no request to Jev. |
| `claude` | A small Claude model answers. No request goes to the Jev API. |
| `jev` | Jev answers, and it needs `TYPESAFE_API_KEY`. The question goes to the TypeSafe API. |

Only the value `jev` sends data to the Jev API.

## Errors

When the backend fails, the CLI `claudetto-decide` prints the error and exits with a non-zero code.
The result of a failed `second_opinion` call keeps the text of the error, so Claude can tell the user why there is no answer.

## Bounds

The timeouts, the number of tries, and the option limits are in `limits.ts` of the slice.
The Jev run ends before `JEV_TIMEOUT_MS`.
See [Bounds](Bounds).

## Related Pages

- [Architecture](Architecture)
- [Bounds](Bounds)
