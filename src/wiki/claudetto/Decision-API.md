# Decision API

This page describes the opt-in decision API of the core plugin `claudetto`.
It is for a user who wants Jev to pick an option of a question that facts can settle, and for a contributor who edits the `decide` slice.

## What It Does

A `tool.call` hook reads each `AskUserQuestion` call.
It sends each question that facts can settle to Jev, and it adds the pick of Jev to the matching option.
Claude and the user see the pick and the confidence.
A question about a goal, a preference, or an approval stays as Claude asked it.
When Jev gives no pick, the question stays as Claude asked it, and the user answers.

## It Is Off by Default

The plugin option `decide` has 2 values:

| Value | Effect |
| --- | --- |
| `off` | The default. The plugin sends no request to Jev. |
| `jev` | Jev picks, and it needs `TYPESAFE_API_KEY`. The question goes to the TypeSafe API. |

Only the value `jev` sends data to the Jev API.

## Errors

When the backend fails, the CLI `claudetto-decide` prints the error and exits with a non-zero code.
The hook then leaves the question as Claude asked it.

## Bounds

The timeouts, the number of tries, and the option limits are in `limits.ts` of the slice.
The Jev run ends before `JEV_TIMEOUT_MS`.
See [Bounds](Bounds).

## Related Pages

- [Architecture](Architecture)
- [Bounds](Bounds)
