# Prompt variants

It shows the system prompt variants of dotclaude, their byte budgets, and the gap in the compact prompt.
Source labels are in [Home](Home).

## The variants

The hooks module replaces the Claude Code sections `intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`, and `lean_body` with the variant of the session model.
The model is Opus 5.5, Sonnet 5.5, Haiku 5.5, or Fable 5.1.
A section with another id passes on unchanged.
A model with no variant keeps the sections of Claude Code.
Source: `plugins/dotclaude/features/prompt/variants.mjs`.

| Variant | Verification line | Other model lines |
| --- | --- | --- |
| Opus 5.5 | off | One sentence before the first tool call, and updates only for new findings |
| Sonnet 5.5 | on | none |
| Haiku 5.5 | on | Finish each step before the next one |
| Fable 5.1 | off (its own guide, unverified until the variant evals) | Targeted edits, and extras go to the end |

Each variant has XML tags, the scope rule, one confirmation rule for actions that are hard to undo, delegation text, and the evidence line of design D30.
The evidence line is also in the output style.

## When the variant is chosen

- The main session gets its variant from `prompt.compose` (**tested**, probe 2.7).
  The hook chooses the variant at the first compose of a session and keeps it.
  A model switch with `/model` does not change the prompt bytes, because a changed system prompt breaks the cache.
- A subagent has its agent body as its system prompt, because `prompt.compose` and `prompt.section` do not run for it (**tested**, probe 2.7).
  The `agent.spawn` hook adds a short block of the subagent model to the end of the task prompt, one time.
  The hook reads the `model` of the spawn, or the model of the parent when it has none.
  A model that only the agent file sets is not visible to the hook (**inferred**), so that subagent gets no block.

## Size of the first request

A variant has no byte bound of its own.
The text of the first request, with no tool schemas, has the targets `FIRST_REQUEST_LOW_BYTES` (8 KB) and `FIRST_REQUEST_HIGH_BYTES` (16 KB) in `tools/limits.mjs`.
`just measure` prints the size and checks them, and it writes no file, where 1 KB is 1,024 bytes.
A size above the high bound fails, and a size below the low bound is reported.

## The compact prompt gap

Claude Code has no route to override the compact prompt.
The `prompt.compose` and `prompt.section` hooks do not reach it.
The [settings snippet](Settings-Snippet) limits compaction instead: `DISABLE_COMPACT` turns it off, and the session stops at the context limit.
The user then starts a fresh session with `/clear`.
