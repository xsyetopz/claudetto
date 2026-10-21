# Ground

This page tells how the `ground` slice of the core plugin `claudetto` checks the claims of a plan file.
A user reads it to learn why Claude gets a deny on a plan, and how to fix it.
A contributor reads it before an edit of `slices/ground/`.

## What It Does for You

Claude can write a number, a `file:line` reference, or a convention with no source.
An example is `npx` in a project that has `bun.lock`.
The `ground` slice finds such claims in a plan file and denies the write.
The check is a program.
It makes no model call, because a check that guesses can block correct text.

## The Hook

The slice adds one `tool.call` hook on `Write` and `Edit`, in the phase `check`.
The hook checks only these files:

- A file under `openspec/changes/`.
- A file named `proposal.md`, `design.md`, or `tasks.md`.

For `Write`, the hook reads `content`.
For `Edit`, it reads `new_string`.
A write of any other file is not checked.

## What Counts as a Source

A claim has a source when it is in one of these:

- A user message of the session.
- A tool result of the session.
- `CLAUDE.md` in the project root.
- The old text of the file that the call changes.

A tool result that is a deny of this check is not a source.
It names each claim, so a retry would pass on it.

## The Claims

| Kind | The check fails when |
| --- | --- |
| Number | A number of 3 digits or more is in no user message and no tool result. A year, a number in the name of a standard (`ISO 8601`, `RFC 3339`), and a number that the text computes do not count. The text computes a number when it is a binary size in bytes (`16 MiB` and `16,777,216`), a total of a table column (three rows or more) or the difference of two cells of the same row. A source can write the number with `_`, as `1_000_000`. |
| `file:line` | The file is found and has fewer lines than the reference. |
| Attribution | A sentence such as `the user chose ...` has words that are mostly not in a user message. |
| Done claim | The text says that tests, checks, lint, or a build pass, or that something is fixed, and the turn has no `Bash` call. A sentence with `must`, `should`, `will`, `if`, or a similar word is not a claim. |
| Convention | The text uses a command of `npm` or `npx` (not the word `npm` in a sentence) in a project with `bun.lock` or `bun.lockb`, or `pip` in a project with `uv.lock`, and no user rule names the tool. |

For a `file:line` reference, the check looks for the file at the project root first.
Then it searches the folders below the root, but it skips `node_modules` and dot folders and reads at most 2,000 folders.
If the check does not find the file, it skips the reference, because a guess would deny a correct one.

## Text That Passes

- A line with `(proposed)` or `[NEEDS CLARIFICATION: ...]`.
- A fenced code block.

## The Deny

The deny lists each claim and gives three ways out:

1. Name the source: a user message, a tool result of this session, or a file of the project.
2. Mark the claim `(proposed)` or `[NEEDS CLARIFICATION: ...]`.
3. Ask the user.

Claude then writes the text again.

## Options and Cost

The slice has no `userConfig` key and no limit.
The hook costs no request and no token.
If the hook throws, Claude Code logs the failure and the call runs.

## Replay

A replay runs the check of the hook on the tool calls of recorded sessions.
It makes no model call.

- The module `slices/ground/adapters/check.ts` exports `check(event, prior)`.
  It runs the source check on one recorded `PreToolUse` call.
- The script `replay.ts` of the `sessions` skill in `claudetto-sessions` feeds it the calls:
  `bun plugins/claudetto-sessions/skills/sessions/replay.ts plugins/claudetto/slices/ground/adapters/check.ts`
- The replay reads the files of the project as they are today.
  A `file:line` reference resolves as a path suffix under the `cwd`, and a reference that does not resolve passes.

The `checked` export of the same module counts the events that the shipped filter takes, which are the writes of a plan or a spec file.
`replay.ts` prints `checked` when the module exports it.
The rate is the denies divided by the events checked.

The run of 2026-10-21 used 1,014 transcript files (952 MB) from `~/.claude/projects`.
The transcripts now hold plan edits, so the rate is measured.
Each deny was graded by hand: a true deny is a claim with no source in the session or the project, and a false deny is a claim that has a source or is no claim.

| Run | Calls replayed | Events checked | Denies | True | False | False rate |
| --- | --- | --- | --- | --- | --- | --- |
| Before the fixes | 25,331 | 53 | 9 | 1 | 8 | 15 percent (8 of 53) |
| After the fixes | 25,436 | 53 | 1 | 1 | 0 | 0 percent (0 of 53) |

The calls differ because live sessions grew between the runs.
The denies before the fixes, by cause:

- `8601`, `3339`, `7763` (4 denies): the number is in the name of a standard (`ISO 8601`, `RFC 3339`, `RFC 7763`).
- `1,000,000` (3 denies): the project writes the number as `1_000_000`, and the check matched only `1,000,000` and `1000000`.
- `892`, `1,005`, `178`, `287`, `47,305`, `46,388`, `917` (1 deny): the numbers are column totals and differences in a table of line counts.
- `16,777,216` (1 deny): the text says `16 MiB (16,777,216 bytes)`, and the project states `16 * 1024 * 1024`.
- `npm` in a project with `bun.lock` (1 deny): the text says "an npm marketplace", which is a name of a Claude Code feature and no command.
- `140` (1 deny, true): "140 pages" of a wiki folder, and the session listed no count.

The 5 fixes are in `slices/ground/domain/claims.ts`, and each has a test in `tests/claudetto/ground/claims.test.ts`.
A fix does not accept a guess: a binary size needs the exact product, a table total needs the exact sum of the column, and a difference needs two cells of the same row.
The sample is 53 events from 5 projects, so the rate has a wide margin.
A false deny costs one rewrite, because the deny names each claim and gives three ways out.

## See Also

- [Spec](Spec)
- [Goal](Goal)
- [Controls](Controls)
- [Sessions](Sessions)
