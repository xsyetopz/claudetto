# Design

This page gives the design principles of claudetto 0.1.0.
Read it to learn the reason behind each part of the plugins.
For each principle, it gives what the principle is, why it holds, and how the code applies it.
Principles 1 to 9 are on this page.
Principles 10 to 18 are on [Design: Principles, Continued](Design-Principles-Continued).
The decisions behind each principle are in [Decisions](Decisions) and its group pages.
[Architecture](Architecture) explains how the parts work together.

The decisions of the 0.1.0 restart are in `openspec/changes/claudetto-0-1-0/design.md`.

## Why 0.1.0

claudetto 0.1.0 starts again from a clean tree.
dotclaude 1.0.0 had faults that the restart removes:

- Its sessions stopped with `Prompt is too long` at about 270,000 tokens.
- Its guard denied good commands.
- Its spec workflow spent tool calls on an event log and a binary.

Claude Code 2.1.301 gives the extension points that fix these faults without a patch of the binary.
The reasons and the list of faults are in `openspec/changes/claudetto-0-1-0/proposal.md` and `faults.md`.

The goal is a full customization of Claude Code through its extension points.
It replaces the built-in prompt and tool texts with shorter text that keeps the needed facts.
It turns off each built-in part that claudetto does not need.
It can send a decision that facts settle to Jev, when the user turns that on.

## Principles

### 1. Only Documented Extension Points

**What:** claudetto changes Claude Code with the mod API, settings, hooks, skills, agents, and output styles.
It never patches the Claude Code binary or its npm package.

**Why:** A patch breaks at each release.
It also breaks the terms of service of Anthropic.
Reading the bundle for facts is permitted.

**How in the code:**

- `plugins/claudetto/hooks/hooks.json` holds the `modules` list with `./register.ts`.
  It also holds two classic hooks, `WorktreeCreate` and `WorktreeRemove`, because no mod event does that work.
- `plugins/claudetto/hooks/register.ts` is generated.
  It calls `on()` 25 times for 14 events.
- The output style `claudetto:Concise` comes from `src/plugins/claudetto/slices/styles/slice.ts`.
- The transforms in `src/plugins/claudetto/slices/prompt/transforms/` are keyed by the id of each built-in section.
  The ids come from a reading of the Claude Code bundle.
  The extracted texts stay in the git-ignored `external/` folder.
  No transform copies them.

### 2. The Least Powerful Component for Each Need

**What:** For each need, claudetto uses the component type with the least cost.

- A fixed operation on files is a CLI.
- A workflow that the user starts is a user-invoked skill that calls a CLI.
- Knowledge that the model looks for is a model-invoked skill.
- A check before or after a tool call is a mod handler.
- A prompt change is a mod handler on `prompt.compose` or `prompt.section`.
- A classic hook is used only when no mod event can do the work.
- The status line is a `statusLine` command.

**Why:** Each skill adds its description to the start of each session.
A mod handler runs in the process, with no Bun start.
A classic hook starts a process for each event that it matches.
The order of rungs that 0.1.0 uses is the decision ladder in `openspec/changes/claudetto-0-1-0/design.md` (D2 there).
Each slice states its rung in the `ladder` field of its `slice.ts`.

**How in the code:**

- The `minispec` CLI is `src/plugins/claudetto/slices/minispec/adapters/cli.ts`.
- User-invoked skills, such as `src/plugins/claudetto/slices/setup/skills/setup/SKILL.md`, set `disable-model-invocation`.
- `src/plugins/claudetto-codegraph/slices/graph/adapters/hook.ts` is the only `adapters/hook.ts` in `src/`.
  The `run.ts` adapters of the `minispec` and `worktree` slices are command entry points.

### 3. No Model Call for a Check That a Script Can Make

**What:** A hook, a script, a setting, or a status-line command does work that needs no judgment.

**Why:** Each model call reads the whole context again.
A check without judgment therefore spends tokens for no gain.
This is an inference.
The `spec` slice of dotclaude 1.0.0 spent tool calls on an event log, which is the cause of the fault E6 in `openspec/changes/claudetto-0-1-0/faults.md`.

**How in the code:**

- The `minispec` CLI creates, validates, shows the status of, and archives a change with no model call.
  It keeps no event log.
- The `asks` slice is a `tool.check` mod handler (`src/plugins/claudetto/slices/asks/slice.ts`).

### 4. Ports and Adapters in Vertical Slices

**What:** A slice holds one capability, from pure domain code to its entry points.
To add a capability, add a slice.
To remove it, remove the slice.

**Why:** Layers spread one capability over four folders.
So parallel agents conflict on shared folders.
Jev picked this pattern over clean architecture in layers, with confidence 0.82, in the work on dotclaude 1.0.0.

**How in the code:**

A slice has `domain/` for pure code, `ports.ts`, `adapters/`, and `limits.ts`.
Its contract is `src/kernel/slice.ts`.

- `biome.json` enforces the import rules.
  A slice imports only `kernel/` and its own folder.
  Domain code imports no adapter and no `kernel/node/`.

### 5. A Generated Composition Root

**What:** `just generate` writes the shared files of each plugin.
These files are `hooks/register.ts`, `hooks/hooks.json`, and the settings snippet.
No one edits these files by hand.

**Why:** A hand-kept list of slices needs an edit for each new slice.
Parallel agents conflict on that list.

**How in the code:**

- `tools/generate/discover.ts` finds each `src/plugins/<plugin>/slices/*/slice.ts`.
- `tools/generate/order.ts` orders the mod handlers by event, phase, slice name, and filter.
  It throws on two handlers of one slice with the same event, filter, and phase.
- `tools/generate/emit/register.ts` writes one literal `on()` call for each handler.
  The mod runtime reads the event name only as a literal.
- `just check` runs `generate --check`.

### 6. Each Plugin Works Alone

**What:** A plugin imports nothing from another plugin.
Each add-on works with no core plugin installed.

**Why:** A user debugs a session with `claudetto-lab`.
So that tool cannot need the core plugin.

**How in the code:**

- `tools/generate/closure.ts` gives each plugin its own copy of the `src/kernel/` modules that it imports.
  The copies go in `plugins/<plugin>/kernel/`.
- `just generate --check` fails when a copy differs from its source.
- The rule for editors is in `.claude/rules/plugin-imports.md`.

### 7. One Owner for Each Bound

**What:** A shared runtime bound is in `src/kernel/budget.ts`.
A slice bound is in `slices/<s>/limits.ts`.
A repository bound is in `tools/limits.ts`.

**Why:** A number that is kept in two places drifts apart.
Tests pin each copy that must match, in code and config, and not in prose.

**How in the code:**

- `CONTEXT_WINDOW` is `300_000` in `src/kernel/budget.ts`.
  The settings snippet sets `autoCompactWindow` to the same value for each model that is not a Haiku model.
- `SUBAGENT_CONTEXT_MAX` in `src/plugins/claudetto/slices/agents/limits.ts` gives the context bound of a subagent.
- `FILE_MAX_LINES` is `300` in `tools/limits.ts`.
  `tests/support/file-size.test.ts` checks it.
- `START_TOKENS` is `9_960` in `tools/limits.ts`.
  `tools/measure.ts` checks the first request against it.

### 8. The Shortest Prompt That Keeps the Facts

**What:** The `prompt` slice replaces each built-in section with shorter text.
The `trim` slice turns off built-in parts that claudetto does not need.
It does so with settings and env entries.

**Why:** Each request sends the system prompt and the tool descriptions again.
Shorter text leaves more context for the work.

**How in the code:**

- `src/plugins/claudetto/slices/prompt/transforms/index.ts` lists one transform for each section.
  It keys each transform by the section id.
- `src/plugins/claudetto/slices/trim/domain/removed.ts` lists each removed part and its switch.
- Each settings key has one owner.
  The settings merge fails when two slices give one key two different values (`src/plugins/claudetto/slices/trim/slice.ts`).

### 9. A Handoff in Place of Compaction

**What:** The main session keeps a window of `300_000` tokens.
The `handoff` slice replaces the summary of a compaction with a handoff that a fork of the session writes.
The option `compaction` set to `built-in` turns the handoff off.

**Why:** The built-in compaction loses facts that the work needs.
A known trigger below the point where the client blocks gives the handoff time to run.
The basis changed in 0.1.0.
dotclaude 1.0.0 wrote a file, ran `/clear`, and submitted a resume prompt (`/dotclaude:handoff`).
In plain `-p`, a clear erases the `result` and the cost.
The decision and its evidence are in `openspec/changes/claudetto-0-1-0/design.md` (D3 there).

**How in the code:**

- `CONTEXT_WINDOW`, `CONTEXT_BLOCK_MARGIN`, and `HANDOFF_TRIGGER_TOKENS` are in `src/kernel/budget.ts`.
- The `handoff` slice registers a `session.compact` hook with the phase `answer` (`src/plugins/claudetto/slices/handoff/slice.ts`).
- The trigger comes from the built-in `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
- Claude Code 2.1.301 caps the window of some models, such as Opus 5.5, at 200K without `autoCompactWindow`.
  The budget file records this fact, found by reading the bundle.

## Related Pages

- [Design: Principles, Continued](Design-Principles-Continued)
- [Decisions](Decisions)
