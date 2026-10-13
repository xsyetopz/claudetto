# Design: Principles, Continued

This page gives the design principles 10 to 18 of dotclaude 1.0.0.
Read it after [Design](Design), which gives principles 1 to 9.
Each principle gives what it is, why it holds, and how the code applies it.

## Principles, Continued

### 10. Asks Only for a Weaker Check or for Discarded Work

**What:** The `asks` slice asks before a call that discards work.
It also asks before a call that adds a skipped test or a lint suppression.
It asks before a call that changes a protected file.
A read never asks.

**Why:** Each ask stops the work and takes the time of the user.
An ask for a read trains the user to approve without a reading.
This is an inference.

**How in the code:**

- The rule is in the header of `src/plugins/dotclaude/slices/asks/slice.ts`.
- `src/plugins/dotclaude/slices/asks/limits.ts` lists the protected paths.
  Examples are the lint config, the runner config, the CI paths, and the hook paths.

### 11. A Floor That the Auto Mode Cannot Pass

**What:** The auto mode classifier allows each safe command.
Risky but recoverable work needs the user.
Each destructive action is forbidden, also when the user asks for it.
The user can still run such a command with a `!` command.

**Why:** The user chose this on 2026-10-12 (`change.md`).

**How in the code:**

- Setup writes the `autoMode` part to the user settings only.
  Claude Code reads it only there (`src/plugins/dotclaude/slices/setup/domain/automode.ts`).
- The forbidden actions are in the `autoMode.hard_deny` list of `src/plugins/dotclaude/slices/setup/texts.ts/automode.json`.
- When the floor stops an action, the agent does not try another way.
  The rule is in `src/plugins/dotclaude/slices/prompt/texts.ts/blocks.md`.

### 12. Jev Decides, and the User Approves

**What:** Each decision that facts settle goes to Jev by default.
A small Claude model answers when Jev gives no answer.
Approvals and preferences stay with the user.

**Why:** The user chose this on 2026-10-12 (`change.md`).

**How in the code:**

- `src/plugins/dotclaude/slices/decide/adapters/jev.ts` and `adapters/fallback.ts` implement one provider port.
  The port is in `ports.ts`.
- `ports.ts` names each reason that Jev gives no answer.
  The reasons are `no-key`, `invalid-key`, `no-balance`, `usage`, and `failed`.
- A question with one option, or with a few choices, is not sent to Jev (`tests/dotclaude/decide/ask.test.ts`).
- `JEV_TIMEOUT_MS` is `45_000` in `src/plugins/dotclaude/slices/decide/limits.ts`.

### 13. A Spec Store That Appends

**What:** The spec workflow is part of the core plugin.
The lanes of a change come from an append-only `events.jsonl`.
The log has one line for each change.

**Why:** One fact is in one place.
A change is a one-line diff.
Two branches merge with no conflict (`change.md`).

**How in the code:**

- `src/kernel/spec-store.ts` holds the types of the store.
  The `spec` slice, the status line, and the handoff read them.
- Only the `spec` slice writes the store.
- The commands are on [Spec Store](Spec-Store).

### 14. A Schema Number and No Legacy Code

**What:** Each file format has a `schema` number.
A reader stops with a message on a number that it does not know.
It does not convert an older file.

**Why:** 1.0.0 has no migration from an older version and no shim (`change.md`).
Code that reads an old layout is code to keep.

**How in the code:**

- `SPEC_SCHEMA` in `src/kernel/spec-store.ts` is the number that the reader accepts.
- `tools/rebuild-pending.txt` lists the files of the previous release that are still in `plugins/`.
  `tools/generate/pending.ts` fails on any other file in `plugins/` that it did not write.
  The list is temporary.
  It is deleted when the rebuild ends.

### 15. Plain Data, Arrow Functions, and Pure Domain Code

**What:** Code uses arrow functions.
Plain data and pure functions are the default.
A class holds state across calls.
An interface names a port.

**Why:** A pure function needs no stub in a test (`design.md`).

**How in the code:**

- Biome sets `useArrowFunction` to `error` in `biome.json`.
  The GritQL rule `tools/lint/arrow-functions.grit` covers `function` declarations.
- `src/kernel/ports.ts` holds the port interfaces.

### 16. Claude Code Owns the Worktrees and the Cleanup

**What:** dotclaude uses the worktrees of Claude Code, such as `isolation: worktree`.
It also uses the garbage collection of Claude Code.
dotclaude makes no worktree with `git worktree add`.

**Why:** Claude Code already does this work.
So dotclaude keeps no cleanup code (`change.md`).

**How in the code:**

- The `implementer` agent sets `isolation: worktree` (`src/plugins/dotclaude/slices/agents/agents/implementer.md`).
- The guard matches `git gc --prune=now` (`src/plugins/dotclaude/slices/guard/domain/matchers/git.ts`).

### 17. Few Subagents, Each with a Bound

**What:** A subagent fits one run.
Few runs go at once, and a reviewer is read-only.

**Why:** These rules come from the lessons of the Bun port to Rust (<https://bun.com/blog/bun-in-rust>).
The scale is that of a subscription.

**How in the code:**

- dotclaude has six agents: `debugger`, `implementer`, `investigator`, `planner`, `researcher`, and `reviewer`.
  Each agent file has a fixed model and effort.
- Each agent file holds the `maxTurns` of `MAX_TURNS` (`src/plugins/dotclaude/slices/agents/limits.ts`).
  The values are 61 for `debugger` and `implementer`.
  They are 41 for `planner`, `researcher`, and `reviewer`.
  They are 31 for `investigator`.
- `reviewer` sets `disallowedTools: Edit, Write, NotebookEdit, Agent`.
- Not in the code: the rule that a reviewer reads only the diff of a package.
  Also not in the code: the rule that a subagent cannot run a git command that changes shared state.

### 18. Own Files in `.dotclaude/`

**What:** dotclaude writes its own files to `.dotclaude/`.
The layout is based on `.claude/`.
It keeps `.claude/` for the files that Claude Code reads.

**Why:** Claude Code reads `.claude/`.
So dotclaude's own files would confuse that reading (`change.md`).

**How in the code:**

- `src/kernel/paths.ts` sets `DOTCLAUDE_DIR` to `.dotclaude`.
- `DOTCLAUDE_LOCAL_PATHS` in the same file lists the paths that git must not track.

## Related Pages

- [Design](Design)
- [Decisions](Decisions)
