# Prompt Size

The `prompt` slice sends one tailored text for the `lean_body` section.
This page gives its measured size and the one part it cannot change.
The rules in the text are on [Prompt](Prompt).

## Size of the Tailored Text

| Measure | Value |
| --- | --- |
| Sections | 8: `intro`, `doing_tasks`, `system`, `blocks`, `verification`, `actions`, `tools`, `counts` |
| Source texts | 6,794 bytes and 1,314 words in the 8 files |
| Sent text (`LEAN_BODY`) | 7,515 bytes and 1,441 words, with the section tags |
| Largest file | `doing-tasks.md`, 3,289 bytes |
| Date | 2026-10-19 |

The source texts are the 8 files in `src/plugins/claudetto/slices/prompt/prompts/`.
`wc -c` and `wc -w` measure them before the section tags.
`LEAN_BODY` is exported by `domain/lean-body.ts`, and Bun 1.4.3 measured it after the build.
It has only ASCII characters, so its bytes and characters are equal.

The sections are counted in `LEAN_BODY`, which has eight `<tag>` lines.

## Size Against the Stock Text

The stock `lean_body` text of Claude Code `2.1.302` is in `tests/claudetto/prompt/fixtures/lean_body.txt`.
It is 616 bytes, which is 612 characters, and 99 words.
The net growth is about 6,900 bytes.

These token counts are estimates, not counts from a tokenizer:
about 1.9k tokens for `LEAN_BODY`, about 150 tokens for the stock text, and about 1.7k tokens of growth.

The repository has no bound on this size.

## How the Text Reaches the Model

Claude Code `2.1.302` and `2.1.303` build the shared `lean_body` section without a `prompt.section` call.
So a `prompt.section` hook never sees that section.
The `prompt.compose` hook of the `prompt` slice replaces its text with `LEAN_BODY`, and it keeps the other sections in their place.
Until this fix, `LEAN_BODY` never reached the model.

The evidence is the `prompt_snapshot` attachment in the transcripts of the eval runs on 2026-10-19.
It showed the stock `# Harness` text, and the `<actions>` text was absent.

## What Is Not Measured Live

The sizes on this page come from the source files and from the built module.
They do not come from a request that the model received.
The live size comes with the eval reruns, and this page does not state one before then.

## The Compact Prompt Gap

The `prompt.compose` and `prompt.section` hooks change the system prompt.
They cannot change the compact prompt of Claude Code.
So the `handoff` slice replaces the built-in compaction by default ([Handoff](Handoff)).
The `context_management` section follows the compaction state of the session ([Prompt](Prompt#compaction-gate)).
With the state `built-in`, the compact prompt stays unchanged.
The snippet does not set `DISABLE_COMPACT` ([Settings Snippet](Settings-Snippet)).

## See Also

- [Evidence](Evidence)
- [Prompt](Prompt)
- [Handoff](Handoff)
