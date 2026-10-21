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
| Number | A number of 3 digits or more is in no user message and no tool result. A year does not count. |
| `file:line` | The file is found and has fewer lines than the reference. |
| Attribution | A sentence such as `the user chose ...` has words that are mostly not in a user message. |
| Done claim | The text says that tests, checks, lint, or a build pass, or that something is fixed, and the turn has no `Bash` call. A sentence with `must`, `should`, `will`, `if`, or a similar word is not a claim. |
| Convention | The text uses `npm` or `npx` in a project with `bun.lock` or `bun.lockb`, or `pip` in a project with `uv.lock`, and no user rule names the tool. |

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

The run of 2026-10-18 used 44 transcript files (46 MB) from `~/.claude/projects`:

| Run | Calls replayed | Events checked | Denies |
| --- | --- | --- | --- |
| The shipped filter | 990 | 0 | 0 |
| Stress: each `Write` and `Edit` of a `.md` file counts as a plan file | 990 | 4 | 1 |
| Stress: each `Write` and `Edit` counts as a plan file | 990 | 19 | 1 |

- The transcripts held no `Write` or `Edit` of a plan or spec file, so the shipped filter checked no event.
  The rate of false denies on real plan edits is not measured yet.
- The one deny is a reference to `src/kernel/paths.ts:55-70` from a past edit.
  The file has 34 lines now, so the reference is stale, and the deny is not false.
- The sample is too small to set a rate.
  A false deny costs one rewrite, because the deny names each claim and gives three ways out.

## See Also

- [Spec](Spec)
- [Goal](Goal)
- [Controls](Controls)
- [Sessions](Sessions)
