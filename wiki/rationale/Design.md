# Design

This page gives the design principles of dotclaude 1.0.0.
Read it to learn the reason behind each part of the plugin.
For each principle, it gives what the principle is, why it holds, and how the code applies it.
Principles 1 to 9 are on this page.
Principles 10 to 18 are on [Design: Principles, Continued](Design-Principles-Continued).
The decisions behind each principle are in [Decisions](Decisions) and its group pages.
[Architecture](Architecture) explains how the parts work together.

The source of the 1.0.0 design is `.dotclaude/spec/changes/1.0.0/change.md` and `design.md`.

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

### 1. Only Documented Extension Points

**What:** dotclaude changes Claude Code with the mod API, settings, hooks, skills, agents, and output styles.
It never patches the Claude Code binary or its npm package.

**Why:** A patch breaks at each release.
It also breaks the terms of service of Anthropic.
Reading the bundle for facts is permitted.

**How in the code:**

- `plugins/dotclaude/hooks/hooks.json` holds one entry, the `modules` list with `./register.ts`.
  The core plugin has no classic hook.
- `plugins/dotclaude/hooks/register.ts` is generated.
  It calls `on()` for 11 events.
- The output style `dotclaude:Concise` comes from `src/plugins/dotclaude/slices/styles/slice.ts`.
- The transforms in `src/plugins/dotclaude/slices/prompt/transforms/` are keyed by the id of each built-in section.
  The ids come from a reading of the Claude Code 2.1.296 bundle.
  The extracted texts stay in the git-ignored `external/` folder.
  No transform copies them.

### 2. The Least Powerful Component for Each Need

**What:** For each need, dotclaude uses the component type with the least cost.

- A fixed operation on files is a CLI.
- A workflow that the user starts is a user-invoked skill that calls a CLI.
- Knowledge that the model looks for is a model-invoked skill.
- A check before or after a tool call is a mod handler.
- A prompt change is a mod handler on `prompt.compose` or `prompt.section`.
- A classic hook is used only when no mod event can do the work.
- The status line is a `statusLine` command.

**Why:** Each skill adds its description to the start of each session.
A mod handler runs in the process, with no Bun start (`design.md`).
A classic hook starts a process for each event that it matches.

**How in the code:**

- The spec CLI is `src/plugins/dotclaude/slices/spec/adapters/cli.ts`.
- User-invoked skills, such as `src/plugins/dotclaude/slices/spec/skills/spec/SKILL.md`, set `disable-model-invocation`.
- `src/plugins/dotclaude-codegraph/slices/graph/adapters/hook.ts` is the only `adapters/hook.ts` in `src/`.

### 3. No Model Call for a Check That a Script Can Make

**What:** A hook, a script, a setting, or a status-line command does work that needs no judgment.

**Why:** Each model call reads the whole context again.
A check without judgment therefore spends tokens for no gain.
This is an inference from `change.md`.

**How in the code:**

- Each `dotclaude-spec` command that changes a state appends one line to `events.jsonl`, after its gate passes.
  No model call runs (`src/plugins/dotclaude/slices/spec/adapters/transition.ts`).
  Schema 2 replaced the `lane` command of schema 1 with these commands, and it removed `packages.md`.
- The `asks` slice is a `check` mod handler (`src/plugins/dotclaude/slices/asks/slice.ts`).

### 4. Ports and Adapters in Vertical Slices

**What:** A slice holds one capability, from pure domain code to its entry points.
To add a capability, add a slice.
To remove it, remove the slice.

**Why:** `design.md` records that Jev picked this pattern over clean architecture in layers, with confidence 0.82.
Layers spread one capability over four folders.
So parallel agents conflict on shared folders.

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

**Why:** A user debugs a session with `dotclaude-lab`.
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
  The settings snippet sets `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to the same value.
- `MAX_TURNS` in `src/plugins/dotclaude/slices/agents/limits.ts` gives the turn bound of each agent.
- `FILE_MAX_LINES` is `300` in `tools/limits.ts`.
  `tests/support/file-size.test.ts` checks it.
- `START_TOKENS` is `9_960` in `tools/limits.ts`.
  `tools/measure.ts` checks the first request against it.

### 8. The Shortest Prompt That Keeps the Facts

**What:** The `prompt` slice replaces each built-in section with shorter text.
The `trim` slice turns off built-in parts that dotclaude does not need.
It does so with settings and env entries.

**Why:** Each request sends the system prompt and the tool descriptions again.
Shorter text leaves more context for the work (`change.md`).

**How in the code:**

- `src/plugins/dotclaude/slices/prompt/transforms/index.ts` lists one transform for each section.
  It keys each transform by the section id.
- `src/plugins/dotclaude/slices/trim/domain/removed.ts` lists each removed part and its switch.
- Each settings key has one owner.
  The settings merge fails when two slices give one key two different values (`src/plugins/dotclaude/slices/trim/slice.ts`).

### 9. A Handoff in Place of Compaction

**What:** The main session keeps a window of `300_000` tokens, and it does not compact.
The `handoff` flow writes a file, runs `/clear`, and submits a resume prompt.

**Why:** `change.md` puts the handoff in place of compaction.
A fixed window gives a known point where the session stops.
This is an inference.

**How in the code:**

- `CONTEXT_WINDOW` and `CONTEXT_BLOCK_MARGIN` are in `src/kernel/budget.ts`.
- The settings snippet sets `DISABLE_COMPACT` to `1`.
  It sets `autoCompactEnabled` to `false` (`wiki/reference/Settings-Snippet.md`).
- The `handoff` slice reads no `state.json` (`src/plugins/dotclaude/slices/handoff/slice.ts`).
- Claude Code 2.1.296 shows a 200K window for the Opus 5.5 model.
  It does so unless `CLAUDE_CODE_AUTO_COMPACT_WINDOW` is set.
  The budget file records this fact, found by reading the bundle.

## Related Pages

- [Design: Principles, Continued](Design-Principles-Continued)
- [Decisions](Decisions)
