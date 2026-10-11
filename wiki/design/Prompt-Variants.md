# Prompt variants

It shows the system prompt variants of dotclaude, their byte budgets, and the gap in the compact prompt.
Source labels are in [Home](Home).

## The variants

The hooks module replaces the Claude Code sections `intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`, and `lean_body` with the variant of the session model.
A variant holds only the text of one model.
The rules that every model shares are the shared sections of `features/prompt/shared.mjs`, and `variantSections` puts them before the model notes ([System prompt](System-Prompt#one-route)).
The model is Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1, or Mythos 5.1, which gets the Fable variant.
A section with another id passes on unchanged.
A model with no variant keeps the sections of Claude Code.
Source: `plugins/dotclaude/features/prompt/variants.mjs` and `plugins/dotclaude/features/prompt/shared.mjs`.

| Variant | Model notes | Verification line in the subagent block |
| --- | --- | --- |
| Opus 5.5 | One sentence before the first tool call, and updates only for new findings | off |
| Sonnet 5.5 | none | on |
| Haiku 5.5 | Finish each step before the next one | on |
| Fable 5.1 and Mythos 5.1 | Targeted edits (one guide covers both models, unverified until the variant evals) | off |

The shared `verification` and `doing_tasks` sections hold the verification rule and the extras rule for the main session, so no model notes repeat them (cuts V2 and V7 of task 29.3).

Each variant has at most one `model_notes` section with XML tags, and Sonnet 5.5 has none.
The block that `agent.spawn` adds to a task prompt has the model lines, the block line (`BLOCK_LINE`), and the evidence line of design D30.
A subagent does not get the shared sections, so the block carries both lines.
The block line says that a failing check, a lint rule, a test, a bound, and a hook each stop the work, and that the agent changes the work to fit them or reports the block to the parent.
The evidence line asks for a new check before Claude undoes finished work because of a claim of fault, also when the user tells it to delete the work.

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
