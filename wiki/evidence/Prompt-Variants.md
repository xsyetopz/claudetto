# Prompt Variants

This page gives the system prompt variants of dotclaude 1.0.0.
Read it to learn which prompt each model gets, and how the prompt size is bounded.
It gives the model of each variant, the verification line of each subagent block, and the size bounds of the first request.
It also gives the gap in the compact prompt.
Source labels are in [Home](Home).
The rules that every model shares are on the page [prompt surface](Prompt-Surface).

## The Variants

The `prompt` slice holds one variant for each model family.
The source is `src/plugins/dotclaude/slices/prompt/domain/variants.ts`.

| Variant | Model | Model notes | Verification line in the subagent block |
| --- | --- | --- | --- |
| `opus` | Opus 5.5 | One sentence before the first tool call, and updates only for new findings | off |
| `sonnet` | Sonnet 5.5 | none | on |
| `haiku` | Haiku 5.5 | Finish each step before the next one | on |
| `fable` | Fable 5.1, and Mythos 5.1 | Notes of the guide of Fable 5.1 | off |

- A variant holds the text of one model only.
- Each variant has at most one `<model_notes>` section.
  Sonnet 5.5 has none.
- The shared `verification` and `doing_tasks` sections hold the rules for the main session.
  No variant repeats them.
- A model id that contains `mythos` gets the `fable` variant.
  The mapping is in `src/plugins/dotclaude/slices/prompt/domain/apply.ts`.
- The variant of each model is set in `VARIANTS`, in the same file.

## When the Variant Is Chosen

- The `prompt.compose` hook chooses the variant at the first compose of a session.
  It keeps that variant.
  The code is in `src/plugins/dotclaude/slices/prompt/adapters/mod.ts`.
- A model switch with `/model` does not change the prompt bytes.
  A changed system prompt would break the prompt cache.
- A subagent uses its agent body as its system prompt.
  The `agent.spawn` hook adds a short block of the model notes to the end of the task prompt, one time.
  The block of each model is in `VARIANTS`.
- The block of a subagent carries the block line and the evidence line.
  The block line says that a failing check, a lint rule, a test, a bound, and a hook each stop the work.
  The evidence line asks for a new check before Claude undoes finished work because of a claim of fault.

## Size of the First Request

The first request has a token bound, `START_TOKENS` (9,960 tokens) in `tools/limits.ts`.
`tools/measure.ts` passes it to `dotclaude-start` as `--bound`.
The text of the first request, with no tool schemas, has two targets in `tools/limits.ts`.

- `FIRST_REQUEST_LOW_BYTES` is 8 KB.
- `FIRST_REQUEST_HIGH_BYTES` is 16 KB.

`just measure` runs `tools/measure.ts`, which reads both bounds.
A size above the high bound fails the check.
A size below the low bound is reported.
In this page, 1 KB is 1,024 bytes.

## The Compact Prompt Gap

The `prompt.compose` and `prompt.section` hooks do not reach the compact prompt of Claude Code.
The [settings snippet](Settings-Snippet) limits compaction instead.
The snippet sets `DISABLE_COMPACT` to `1`.
It also sets `autoCompactEnabled` to `false`.
The session then stops at the context limit.
The user starts a fresh session with `/clear`.

## Related Pages

- [Evidence](Evidence): the index of the evidence pages and their source files.
