# Ground

This page tells how the `ground` slice of the core plugin `claudetto` checks the claims of a plan file.
A user reads it to learn why Claude gets a deny on a plan, and how to fix it.
A contributor reads it before an edit of `plugins/claudetto/modules/work/ground/`.

## What It Does for You

Claude can write a number or a `file:line` reference with no source.
The `ground` slice finds such claims in a plan file and denies the write.
The check is a program.
It reads digits and paths, and no English word, because a word rule is brittle and the user asked for each one to be removed (the user, 2026-10-27).
It makes no model call, because a check that guesses can block correct text.

## The Hook

The slice adds one `tool.call` hook on `Write` and `Edit`.
The hook checks only these files:

- A file under `openspec/changes/`.
- A file named `proposal.md`, `design.md`, or `tasks.md`.

For `Write`, the hook reads `content`.
For `Edit`, it reads `new_string`.
A write of any other file is not checked.
A file named `*.test.*` and a file in a `fixtures` folder are not checked, also under `openspec/changes/`.

## What Counts as a Source

A claim has a source when it is in one of these:

- A user message of the session.
- An answer of `AskUserQuestion`, which counts as a user message.
- The text of the handoff, which counts as a user message in any role.
- A tool result of the session.
- `CLAUDE.md` and `AGENTS.md` in the project root, and the files of `.claude/rules/`.
- The old text of the file that the call changes.

The sources are the messages of the agent that makes the call.
For a subagent, the hook reads the transcript of that subagent with `$.session.messages({ agentId })`.
A tool result of the subagent counts for that subagent only.
If the session cannot read the transcript, the hook skips the check and the call runs.

A tool result that is a deny of this check is not a source.
It names each claim, so a retry would pass on it.

## The Claims

| Kind | The check fails when |
| --- | --- |
| Number | A number of 3 digits or more is in no user message and no tool result. A year, a number in the name of a standard (`ISO 8601`, `RFC 3339`), and a number that the text computes do not count. The text computes a number when it is a binary size in bytes (`16 MiB` and `16,777,216`), a total of a table column (three rows or more) or the difference of two cells of the same row. A source can write the number with `_`, as `1_000_000`. |
| `file:line` | The file is found and has fewer lines than the reference. |

The checks of an attribution (`the user chose ...`), of a claim of done (`tests pass`), and of a package manager in a project with another lock file were removed on 2026-10-27, because each one matched English words.

For a `file:line` reference, the check looks for the file at the project root first.
Then it searches the folders below the root, but it skips `node_modules` and dot folders and reads at most 2,000 folders.
If the check does not find the file, it skips the reference, because a guess would deny a correct one.

## Text That Passes

- A line with `(proposed)` or `[NEEDS CLARIFICATION: ...]`.
- A fenced code block.
- A number in a `#### Scenario:` block of a `spec.md` file.
  The block ends at the next heading of level 4 or above.
  A number there is an input of a case and not a claim.
- An `Edit` of a `spec.md` file whose `old_string` is in a scenario block.

## The Deny

The deny lists each claim and gives three ways out:

1. Name the source: a user message, a tool result of this session, or a file of the project.
   When a local command with no model call or login can show the claim, run it, and name its result.
2. Mark the claim `(proposed)` or `[NEEDS CLARIFICATION: ...]`.
3. Ask the user.

Claude then writes the text again.

## Options and Cost

The slice has no `userConfig` key and no limit.
The hook costs no request and no token.
If the hook throws, Claude Code logs the failure and the call runs.

## Replay

A replay ran the check of the hook on the tool calls of recorded sessions.
It made no model call.
The replay script is not in 0.3.0, and the shipped plugin has no replay entry point.

- The replay ran the source check on one recorded `PreToolUse` call at a time.
- The replay read the files of the project as they were on the day of the run.
  A `file:line` reference resolved as a path suffix under the `cwd`, and a reference that did not resolve passed.
- The rate is the denies divided by the events checked.
  The events checked are the writes of a plan or a spec file.

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

The 5 fixes are in `plugins/claudetto/modules/work/ground/domain/claims.ts`, and each has a test in `tests/claudetto/work/ground/claims.test.ts`.
A fix does not accept a guess: a binary size needs the exact product, a table total needs the exact sum of the column, and a difference needs two cells of the same row.
The sample is 53 events from 5 projects, so the rate has a wide margin.
A false deny costs one rewrite, because the deny names each claim and gives three ways out.

## Related Pages

- [Spec](Spec)
- [Finish](Finish)
- [Controls](Controls)
