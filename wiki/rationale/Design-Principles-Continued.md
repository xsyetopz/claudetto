# Design: Principles, Continued

This page gives the design principles 10 to 18 of claudetto 0.1.0.
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

- The rule is in the header of `src/plugins/claudetto/slices/asks/slice.ts`.
- `src/plugins/claudetto/slices/asks/limits.ts` lists the protected paths.
  Examples are the lint config, the runner config, the CI paths, and the hook paths.

### 11. A Floor That the Auto Mode Cannot Pass

**What:** The auto mode classifier allows each safe command.
Risky but recoverable work needs the user.
Each destructive action is forbidden, also when the user asks for it.
The user can still run such a command with a `!` command.

**Why:** The user chose this on 2026-10-12.

**How in the code:**

- Setup writes the `autoMode` part to the user settings only.
  Claude Code reads it only there (`src/plugins/claudetto/slices/setup/domain/automode.ts`).
- The forbidden actions are in the `autoMode.hard_deny` list.
  Setup builds the list from `src/plugins/claudetto/slices/setup/texts.ts/automode.json` and the `floor` and `subagent` rules of the catalog.
- When the floor stops an action, the agent does not try another way.
  The rule is in `src/plugins/claudetto/slices/prompt/texts.ts/blocks.md`.

### 12. Jev Decides When the User Turns It On

**What:** A decision that facts settle can go to Jev.
A small Claude model answers when Jev gives no answer.
Approvals and preferences stay with the user.

**Why:** The user chose this on 2026-10-12.
The basis changed in 0.1.0.
dotclaude 1.0.0 sent such decisions to Jev by default.
In 0.1.0 the `decide` option is `off` by default, because the default sent text to an external service that the user did not choose.
The decision is D5 in `openspec/changes/claudetto-0-1-0/design.md`.

**How in the code:**

- The options are `off`, `claude`, and `jev` (`src/plugins/claudetto/slices/decide/domain/mode.ts`).
  With `off`, the slice registers no tool and makes no call.
- `src/plugins/claudetto/slices/decide/adapters/jev.ts` and `adapters/fallback.ts` implement one provider port.
  The port is in `ports.ts`.
- `ports.ts` names each reason that Jev gives no answer.
  The reasons are `no-key`, `invalid-key`, `no-balance`, `usage`, and `failed`.
- A question with one option, or with a few choices, is not sent to Jev (`tests/claudetto/decide/ask.test.ts`).
- `JEV_TIMEOUT_MS` is `45_000` in `src/plugins/claudetto/slices/decide/limits.ts`.

### 13. A Change Record in Checked Tasks

**What:** The MiniSpec workflow is part of the core plugin.
The state of a change is in its `tasks.md`, where each checked task is a done task.
The `minispec` CLI keeps no log.

**Why:** One fact is in one place.
The handoff reads the state of a change from `tasks.md`, so a session can go on after a handoff.
The spec store of dotclaude 1.0.0 kept an append-only event log.
That log and its binary spent tool calls on each step.
The decision is D4 in `openspec/changes/claudetto-0-1-0/design.md`.

**How in the code:**

- `src/kernel/change.ts` holds the rules that read the task state.
  The `minispec` CLI and the handoff share them, and neither imports the other.
- The commands are on [MiniSpec](MiniSpec).

### 14. No Legacy Code

**What:** claudetto 0.1.0 has no compatibility layer for the settings, files, or commands of dotclaude 1.0.0.
A file in `plugins/` has a source in `src/`.

**Why:** Code that reads an old layout is code to keep.
The restart is clean, and no setting carries over.

**How in the code:**

- `tools/generate/stray.ts` fails on each file in `plugins/` that the generator did not write.

### 15. Plain Data, Arrow Functions, and Pure Domain Code

**What:** Code uses arrow functions.
Plain data and pure functions are the default.
A class holds state across calls.
An interface names a port.

**Why:** A pure function needs no stub in a test.

**How in the code:**

- Biome sets `useArrowFunction` to `error` in `biome.json`.
  The GritQL rule `tools/lint/arrow-functions.grit` covers `function` declarations.
- `src/kernel/ports.ts` holds the port interfaces.

### 16. Claude Code Owns the Worktrees and the Cleanup

**What:** claudetto uses the worktrees of Claude Code, such as `isolation: worktree`.
It also uses the garbage collection of Claude Code.
claudetto makes no worktree with `git worktree add`.

**Why:** Claude Code already does this work.
So claudetto keeps no cleanup code for worktrees.
The `gc` slice sweeps only the outputs of Claude itself, inside the roots that it names.

**How in the code:**

- The `implementer` agent sets `isolation: worktree` (`src/plugins/claudetto/slices/agents/agents/implementer.md`).
- The guard matches `git gc --prune=now` (`src/plugins/claudetto/slices/guard/domain/matchers/git.ts`).
- `tests/claudetto/agents/no-worktree-add.test.ts` checks the first rule.

### 17. Few Subagents, Each with a Bound

**What:** A subagent fits one run.
Few runs go at once, and a reviewer is read-only.

**Why:** These rules come from the lessons of the Bun port to Rust (<https://bun.com/blog/bun-in-rust>).
The scale is that of a subscription.

**How in the code:**

- claudetto has six agents: `debugger`, `implementer`, `investigator`, `planner`, `researcher`, and `reviewer`.
  Each agent file has a fixed model and effort.
- No agent file has a `maxTurns`, because a run at its turn limit returns no report (`tests/claudetto/agents/roster.test.ts`).
  The bound is a context bound instead.
  `SUBAGENT_CONTEXT_MAX` is `100_000` tokens, and `HAIKU_CONTEXT_MAX` is `85_000` tokens (`src/plugins/claudetto/slices/agents/limits.ts`).
  Over its bound, a subagent gets a note to report now, with a report of `REPORT_MAX_WORDS` words or fewer.
- `reviewer` has the tools `Read`, `Grep`, `Glob`, and `Bash`, so it has no `Edit` and no `Write`.
- Not in the code: the rule that a reviewer reads only the diff of a package.

### 18. Own Files in `.claudetto/`

**What:** claudetto writes its own files to `.claudetto/`.
The layout is based on `.claude/`.
It keeps `.claude/` for the files that Claude Code reads.

**Why:** Claude Code reads `.claude/`.
So the own files of claudetto would confuse that reading.

**How in the code:**

- `src/kernel/paths.ts` sets `CLAUDETTO_DIR` to `.claudetto`.
- `CLAUDETTO_LOCAL_PATHS` in the same file lists the paths that git must not track.

## Related Pages

- [Design](Design)
- [Decisions](Decisions)
