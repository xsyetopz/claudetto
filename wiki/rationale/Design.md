# Design

This page gives the design principles of dotclaude 1.0.0.
For each principle, it gives what the principle is, why it holds, and how the code applies it.
The decisions behind each principle are in [Decisions](Decisions) and its group pages.
[Architecture](Architecture) explains how the parts work together.

The source of the 1.0.0 design is `.dotclaude/spec/changes/1.0.0/change.md` and `design.md`.
Each code path is relative to the repository root.

## Why 1.0.0

dotclaude 1.0.0 starts again from an empty tree.
The previous release failed in three ways:

- It did not ship as a product.
  Its first follow-up plan added one task for each session.
  After 40 of 113 tasks, it had no release.
- Its architecture was not modular.
  Entry points grew by accretion, and one capability had 11 files.
- OpenSpec was coupled into the setup, the status line, the settings snippet, the tests, and the wiki.

The goal is a full customization of Claude Code through its extension points.
It replaces the built-in prompt and tool texts with shorter text that keeps the needed facts.
It turns off each built-in part that dotclaude does not need.
It sends each decision that facts settle to Jev, and not to the user.

## Principles

### 1. Only documented extension points

What: dotclaude changes Claude Code with the mod API, settings, hooks, skills, agents, and output styles.
It never patches the Claude Code binary or its npm package.

Why: A patch breaks at each release, and it breaks the terms of service of Anthropic.
Reading the bundle for facts is permitted.

How in the code:

- `plugins/dotclaude/hooks/hooks.json` holds one entry, the `modules` list with `./register.ts`.
  The core plugin has no classic hook.
- `plugins/dotclaude/hooks/register.ts` is generated.
  It calls `on()` for 11 events.
- The output style `dotclaude:Concise` comes from `src/plugins/dotclaude/slices/styles/slice.ts`.
- The transforms in `src/plugins/dotclaude/slices/prompt/transforms/` are keyed by the id of each built-in section.
  The ids come from a reading of the Claude Code 2.1.296 bundle.
  The extracted texts stay in the git-ignored `external/` folder, and no transform copies them.

### 2. The least powerful component for each need

What: For each need, dotclaude uses the component type with the least cost.
A fixed operation on files is a CLI.
A workflow that the user starts is a user-invoked skill that calls a CLI.
Knowledge that the model looks for is a model-invoked skill.
A check before or after a tool call is a mod handler.
A prompt change is a mod handler on `prompt.compose` or `prompt.section`.
A classic hook is used only when no mod event can do the work.
The status line is a `statusLine` command.

Why: Each skill adds its description to the start of each session.
A mod handler runs in the process, with no Bun start (`design.md`).
A classic hook starts a process for each event that it matches.

How in the code:

- The spec CLI is `src/plugins/dotclaude/slices/spec/adapters/cli.ts`.
- User-invoked skills, such as `src/plugins/dotclaude/slices/spec/skills/spec/SKILL.md`, set `disable-model-invocation`.
- `src/plugins/dotclaude-codegraph/slices/graph/adapters/hook.ts` is the only `adapters/hook.ts` in `src/`.

### 3. No model call for a check that a script can make

What: A hook, a script, a setting, or a status-line command does work that needs no judgment.

Why: Each model call reads the whole context again.
A check without judgment therefore spends tokens for no gain (inference from `change.md`).

How in the code:

- `dotclaude-spec lane` appends one line to `events.jsonl`, and it sets the package checkbox in `packages.md`.
  No model call runs (`src/plugins/dotclaude/slices/spec/adapters/lane.ts`).
- The `asks` slice is a `check` mod handler (`src/plugins/dotclaude/slices/asks/slice.ts`).

### 4. Ports and adapters in vertical slices

What: A slice holds one capability, from pure domain code to its entry points.
To add a capability, add a slice.
To remove it, delete the slice.

Why: `design.md` records that Jev picked this pattern over clean architecture in layers, with confidence 0.82.
Layers spread one capability over four folders, so parallel agents conflict on shared folders.

How in the code:

A slice has `domain/` for pure code, `ports.ts`, `adapters/`, and `limits.ts`.
The contract is `src/kernel/slice.ts`.

- `biome.json` enforces the import rules.
  A slice imports only `kernel/` and its own folder.
  Domain code imports no adapter and no `kernel/node/`.

### 5. A generated composition root

What: `just generate` writes the shared files of each plugin, such as `hooks/register.ts`, `hooks/hooks.json`, and the settings snippet.
No one edits these files by hand.

Why: A hand-kept list of slices needs an edit for each new slice, and parallel agents conflict on it.

How in the code:

- `tools/generate/discover.ts` finds each `src/plugins/<plugin>/slices/*/slice.ts`.
- `tools/generate/order.ts` orders the mod handlers by event, phase, slice name, and filter.
  It throws on two handlers of one slice with the same event, filter, and phase.
- `tools/generate/emit/register.ts` writes one literal `on()` call for each handler, because the mod runtime reads the event name only as a literal.
- `just check` runs `generate --check`.

### 6. Each plugin works alone

What: A plugin imports nothing from another plugin.
Each add-on works with no core plugin installed.

Why: A user debugs a session with `dotclaude-lab`, so that tool cannot need the core plugin.

How in the code:

- `tools/generate/closure.ts` gives each plugin its own copy of the `src/kernel/` modules that it imports, in `plugins/<plugin>/kernel/`.
- `just generate --check` fails when a copy differs from its source.
- The rule for editors is in `.claude/rules/plugin-imports.md`.

### 7. One owner for each bound

What: A shared runtime bound is in `src/kernel/budget.ts`.
A slice bound is in `slices/<s>/limits.ts`.
A repository bound is in `tools/limits.ts`.

Why: A number kept in two places drifts apart.
Tests pin each copy that must match, in code and config, and not in prose.

How in the code:

- `CONTEXT_WINDOW` is `300_000` in `src/kernel/budget.ts`.
  The settings snippet sets `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to the same value.
- `MAX_TURNS` in `src/plugins/dotclaude/slices/agents/limits.ts` gives the turn bound of each agent.
- `FILE_MAX_LINES` is `300` in `tools/limits.ts`, and `tests/support/file-size.test.ts` checks it.
- `START_TOKENS` is `9_960` in `tools/limits.ts`, and `tools/measure.ts` checks the first request against it.

### 8. The shortest prompt that keeps the facts

What: The `prompt` slice replaces each built-in section with shorter text.
The `trim` slice turns off built-in parts that dotclaude does not need, with settings and env entries.

Why: Each request sends the system prompt and the tool descriptions again.
Shorter text leaves more context for the work (`change.md`).

How in the code:

- `src/plugins/dotclaude/slices/prompt/transforms/index.ts` lists one transform for each section, keyed by the section id.
- `src/plugins/dotclaude/slices/trim/domain/removed.ts` lists each removed part and its switch.
- Each settings key has one owner.
  The settings merge fails when two slices give one key two different values (`src/plugins/dotclaude/slices/trim/slice.ts`).

### 9. A handoff in place of compaction

What: The main session keeps a window of `300_000` tokens, and it does not compact.
The `handoff` flow writes a file, runs `/clear`, and submits a resume prompt.

Why: `change.md` puts the handoff in place of compaction.
A fixed window gives a known point where the session stops (inference).

How in the code:

- `CONTEXT_WINDOW` and `CONTEXT_BLOCK_MARGIN` are in `src/kernel/budget.ts`.
- The settings snippet sets `DISABLE_COMPACT` to `1` and `autoCompactEnabled` to `false` (`wiki/reference/Settings-Snippet.md`).
- The `handoff` slice keeps its flow state in memory, and it reads no `state.json` (`src/plugins/dotclaude/slices/handoff/slice.ts`).
- Claude Code 2.1.296 shows a 200K window for the Opus 5.5 model unless `CLAUDE_CODE_AUTO_COMPACT_WINDOW` is set.
  The budget file records this fact, found by reading the bundle.

### 10. Asks only for a weaker check or for discarded work

What: The `asks` slice asks before a call that discards work.
It also asks before a call that adds a skipped test or a lint suppression, or that changes a protected file.
A read never asks.

Why: Each ask stops the work and takes the time of the user.
An ask for a read trains the user to approve without a reading (inference).

How in the code:

- The rule is in the header of `src/plugins/dotclaude/slices/asks/slice.ts`.
- `src/plugins/dotclaude/slices/asks/limits.ts` lists the protected paths, such as the lint config, the runner config, the CI paths, and the hook paths.

### 11. A floor that the auto mode cannot pass

What: The auto mode classifier allows each safe command.
Risky but recoverable work needs the user.
Each destructive action is forbidden, also when the user asks for it.
The user can still run such a command with a `!` command.

Why: The user chose this on 2026-10-12 (`change.md`).

How in the code:

- Setup writes the `autoMode` part to the user settings only, because Claude Code reads it only there (`src/plugins/dotclaude/slices/setup/domain/automode.ts`).
- The forbidden actions are in the `autoMode.hard_deny` list of `src/plugins/dotclaude/slices/setup/texts.ts/automode.json`.
- When the floor stops an action, the agent does not try another way (`src/plugins/dotclaude/slices/prompt/texts.ts/blocks.md`).

### 12. Jev decides, and the user approves

What: Each decision that facts settle goes to Jev by default.
A small Claude model answers when Jev gives no answer.
Approvals and preferences stay with the user.

Why: The user chose this on 2026-10-12 (`change.md`).

How in the code:

- `src/plugins/dotclaude/slices/decide/adapters/jev.ts` and `adapters/fallback.ts` implement one provider port, in `ports.ts`.
- `ports.ts` names each reason that Jev gives no answer: `no-key`, `invalid-key`, `no-balance`, `usage`, and `failed`.
- A question with one option, or with a few choices, is not sent to Jev (`tests/dotclaude/decide/ask.test.ts`).
- `JEV_TIMEOUT_MS` is `45_000` in `src/plugins/dotclaude/slices/decide/limits.ts`.

### 13. A spec store that appends

What: The spec workflow is part of the core plugin.
The lanes of a change come from an append-only `events.jsonl`, with one line for each change.

Why: One fact is in one place, a change is a one-line diff, and two branches merge with no conflict (`change.md`).

How in the code:

- `src/kernel/spec-store.ts` holds the types of the store.
  The `spec` slice, the status line, and the handoff read them.
- Only the `spec` slice writes the store.
- The commands are on [Spec-Store](Spec-Store).

### 14. A schema number and no legacy code

What: Each file format has a `schema` number.
A reader stops with a message on a number that it does not know, and it does not convert an older file.

Why: 1.0.0 has no migration from an older version and no shim (`change.md`).
Code that reads an old layout is code to keep.

How in the code:

- `SPEC_SCHEMA` in `src/kernel/spec-store.ts` is the number that the reader accepts.
- `tools/rebuild-pending.txt` lists the files of the previous release that are still in `plugins/`.
  `tools/generate/pending.ts` fails on any other file in `plugins/` that it did not write.
  The list is temporary, and it is deleted when the rebuild ends.

### 15. Plain data, arrow functions, and pure domain code

What: Code uses arrow functions.
Plain data and pure functions are the default.
A class holds state across calls, and an interface names a port.

Why: A pure function needs no stub in a test (`design.md`).

How in the code:

- Biome sets `useArrowFunction` to `error` in `biome.json`.
  The GritQL rule `tools/lint/arrow-functions.grit` covers `function` declarations.
- `src/kernel/ports.ts` holds the port interfaces.

### 16. Claude Code owns the worktrees and the cleanup

What: dotclaude uses the worktrees of Claude Code, such as `isolation: worktree`, and its garbage collection.
dotclaude makes no worktree with `git worktree add`.

Why: Claude Code already does this work, so dotclaude keeps no cleanup code (`change.md`).

How in the code:

- The `implementer` agent sets `isolation: worktree` (`src/plugins/dotclaude/slices/agents/agents/implementer.md`).
- The guard matches `git gc --prune=now` (`src/plugins/dotclaude/slices/guard/domain/matchers/git.ts`).

### 17. Few subagents, each with a bound

What: A subagent fits one run.
Few runs go at once, and a reviewer is read-only.

Why: These rules come from the lessons of the Bun port to Rust (<https://bun.com/blog/bun-in-rust>), at the scale of a subscription.

How in the code:

- dotclaude has six agents: `debugger`, `implementer`, `investigator`, `planner`, `researcher`, and `reviewer`.
  Each agent file has a fixed model and effort.
- Each agent file holds the `maxTurns` of `MAX_TURNS` (`src/plugins/dotclaude/slices/agents/limits.ts`).
  The values are 61 for `debugger` and `implementer`, 41 for `planner`, `researcher`, and `reviewer`, and 31 for `investigator`.
- `reviewer` sets `disallowedTools: Edit, Write, NotebookEdit, Agent`.
- Not in the code: the rule that a reviewer reads only the diff of a package, and the rule that a subagent cannot run a git command that changes shared state.

### 18. Own files in `.dotclaude/`

What: dotclaude writes its own files to `.dotclaude/`, with a layout based on `.claude/`.
It keeps `.claude/` for the files that Claude Code reads.

Why: Claude Code reads `.claude/`, so dotclaude's own files would confuse that reading (`change.md`).

How in the code:

- `src/kernel/paths.ts` sets `DOTCLAUDE_DIR` to `.dotclaude`.
- `DOTCLAUDE_LOCAL_PATHS` in the same file lists the paths that git must not track.

