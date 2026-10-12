# Compaction and context

This page says what fills the context of Claude Code, when it compacts the context, and what a compaction keeps.
It covers Claude Code `2.1.296`.
Each fact from the binary comes from a search of its strings, or from the official docs, and the section says which.
Each inference is marked as inference.

## Window sizes

- The default window is 200,000 tokens.
  Source: the default window constant in the `2.1.296` strings.
- A model ID with the `[1m]` suffix selects a window of 1,000,000 tokens.
  Source: the `2.1.296` strings match the suffix, and they offer `sonnet[1m]` for a 1M window.
- `CLAUDE_CODE_DISABLE_1M_CONTEXT` turns off the 1M choice.
  Source: the `2.1.296` strings.
- `claude-sonnet-5-5` had a window of 1,000,000 tokens in the measurement of 2026-10-12.
  Source: [Handoff-Cost](Handoff-Cost).
- The comment on `CONTEXT_WINDOW` in `src/kernel/budget.ts` says that Claude Code `2.1.296` warns against a 200K window for `claude-opus-5-5` unless `CLAUDE_CODE_AUTO_COMPACT_WINDOW` is set.
  I did not check this comment in the strings.
- The sizes of the other models are not settled, so this page gives no others.

## What fills the context

The official docs list these items, in the order that a session loads them.

- The system prompt, which the user does not see.
- The `CLAUDE.md` files of the project and the user.
- Auto memory, which is the first 200 lines or 25 KB of `MEMORY.md`.
- Environment information, such as the working directory and the platform.
- The names of MCP tools.
  The schemas stay deferred until a tool search loads them, by default.
- The one-line descriptions of the skills.
  The body of a skill loads only when Claude uses it.
- The messages of the conversation, the tool calls, the tool output, and the file reads.

The docs give a token count for some items as an illustration.
This page does not repeat those counts, because they are not measured.

## When auto-compaction starts

The threshold is the effective window minus 13,000 tokens.
The effective window is the window minus the smaller of the output limit and 20,000 tokens.
Source: the threshold function and the 20,000 constant in the `2.1.296` strings.
The threshold is an inference from these two formulas, and I did not measure it.

- With a 200,000-token window and an output limit of at least 20,000 tokens, the threshold is 167,000 tokens (inference).
- With the 300,000-token window of the dotclaude snippet, the threshold is 267,000 tokens (inference).
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` sets a percentage of the effective window from 0 to 100.
  The threshold is then the lower of that value and the default threshold.
- The next request is blocked at the effective window minus 3,000 tokens.
  With the default output limit, that is the window minus 23,000 tokens (inference).
  `CONTEXT_BLOCK_MARGIN` in `src/kernel/budget.ts` has the same value, 23,000, and gives 20,000 plus 3,000 as its source.

### Settings and env vars

| Name | Kind | Effect | Source |
| --- | --- | --- | --- |
| `autoCompactEnabled` | settings key, boolean, default `true` | Turns auto-compaction on or off. | Settings schema, `dossier/cc-2.1.296/settings.md` |
| `autoCompactWindow` | settings key, `100000` to `1000000` or `"auto"`, per model | Sets the window for auto-compaction of one model. | Settings schema description |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | env var | Sets the window for auto-compaction, and takes precedence over `autoCompactWindow`. | `2.1.296` strings, `dossier/cc-2.1.296/env.md` |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | env var | Sets the threshold as a percentage of the effective window. | `2.1.296` strings |
| `DISABLE_AUTO_COMPACT` | env var | Turns off auto-compaction. | `2.1.296` strings |
| `DISABLE_COMPACT` | env var | Turns off auto-compaction and `/compact`. | `2.1.296` strings, `dossier/cc-2.1.296/env.md` |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | env var | Sets the window of the model. | `dossier/cc-2.1.296/env.md` |

The `src/kernel/budget.ts` comment says that Claude Code honors `CLAUDE_CODE_MAX_CONTEXT_TOKENS` only with `DISABLE_COMPACT`.
I did not check that claim in the strings.

## What a compaction keeps and drops

A compaction asks the model for a summary of the conversation, and the summary replaces the earlier messages.
The summary prompt in the `2.1.296` strings asks for these sections.

1. The primary request and intent.
2. The key technical concepts.
3. The files and code sections.
4. The errors and fixes.
5. The problem solving.
6. All user messages that are not tool results.
7. The pending tasks.
8. The current work.
9. The next step.

The binary also has two variants of this prompt.

- A partial summary covers only the recent messages.
  The earlier messages stay intact.
- A shorter prompt asks for a summary of 2,000 words or fewer.
  The strings do not say when Claude Code uses it.

The official docs list what the context holds after a compaction.

- The system prompt, `CLAUDE.md`, auto memory, and the names of the MCP tools reload.
- Claude Code re-reads up to five of the files that were modified most recently.
- Claude Code re-injects the body of each invoked skill, up to 5,000 tokens for each skill.
- The skill descriptions do not reload.

The messages, the tool output, and the file contents that are not re-read leave the context (inference from the docs).

## `/compact` and `/clear`

- `/compact` starts a compaction now.
  The strings describe the command as a way to free context by summarizing the conversation so far.
  `DISABLE_COMPACT` removes the command.
- `/clear` ends the conversation and starts a new one with no earlier messages.
  The strings suggest `/clear` for a fresh start when a file is too large for the window.
- `/compact` keeps a summary of the conversation.
  `/clear` keeps nothing of it (inference from the two commands).

## Context in dotclaude

- The settings snippet sets `DISABLE_COMPACT` to `1`, `autoCompactEnabled` to `false`, and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` and `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to `300000`.
  Source: `src/plugins/dotclaude/slices/prompt/slice.ts`, and [Settings-Snippet](Settings-Snippet).
- With compaction off, a session that reaches its limit stops.
  It does not compact, so it loses its state.
  Source: the comment on `CONTEXT_WINDOW` in `src/kernel/budget.ts`.
- The prompt text of the `context_management` section says that the conversation is summarized.
  The prompt slice replaces that text with a note that compaction is off, and it does so only when `DISABLE_COMPACT` is set.
  Source: `src/plugins/dotclaude/slices/prompt/transforms/context_management.ts` and `src/plugins/dotclaude/slices/prompt/adapters/mod.ts`.
- The handoff is the alternative to a compaction.
  The `handoff` slice writes the state of the work to a file, the user runs `/clear`, and the next session reads the file.
  See [Context-And-Handoff](Context-And-Handoff).
- One measured run on 2026-10-12 compared the two.
  A handoff cost $0.0630, and a compaction with its follow-up turn cost $0.2288, at the API list price.
  The run used one session of about 81,000 tokens, so it has no spread.
  See [Handoff-Cost](Handoff-Cost).
- The bounds of the context of a subagent are in [Context-Bound](Context-And-Handoff).

## Sources

- The `2.1.296` strings, searched with `grep` for the names and the constants above.
- The extracts of the compaction prompts in `external/cc-extract/2.1.296/compaction/`.
- The dossier of the binary, `external/dossier/cc-2.1.296/env.md` and `settings.md`.
- The official docs page "Explore the context window" at `code.claude.com/docs/en/context-window`, read on 2026-10-13.
- The kernel constants in `src/kernel/budget.ts`, and the snippet in `src/plugins/dotclaude/slices/prompt/slice.ts`.

## Not settled

- The window of each model, except the three cases above.
- The threshold for a model whose output limit is below 20,000 tokens.
- The exact content that a compaction keeps, which only the docs describe.
