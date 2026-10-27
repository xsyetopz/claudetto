## Why

The user wants a handoff that works like compaction, but better and for less, so that the model summary of Claude Code never runs (the user, 2026-10-26).
Ugly but effective code is fine, but no patch of the Claude Code program (the user, 2026-10-26, and `AGENTS.md`).

The mod API makes this possible with no patch (Claude Code Docs for 2.1.310, `extend/mod-api/types/session`):

- Each compaction goes through the `session.compact` hook: `/compact` (`manual`), the threshold and "prompt is too long" (`auto`), `$.session.compact` (`plugin`), and `precompute`.
- A hook can answer with its own `{ messages, tokensBefore, tokensAfter }` and not call `next(e)`. Then no model request runs: `usage` is "Absent when a hook answered".
- A message with a `handle` "stays as it is", so the last turns can stay word for word.

The handoff of today has faults that a fixed format stops. The handoff `.claude/claudetto/handoffs/handoff-20261026T133703Z.md` of this session shows them:

- It quotes a `<task-notification>` block as "the last words of the user".
- It says "Next open task: `1.1`" and "Open tasks ... none" in the same file.
- It repeats each full question text under "Decisions".
- It has no headings.

Research of 2026-10-26 (`.claude/claudetto/research/handoff-2026-10-26.md`) adds two facts:

- Summaries keep facts but lose rules. In arXiv 2608.29028, marker survival fell from 0.954 to 0.690 while fact survival stayed at about 0.99.
- A handoff once dropped a pinned API version (Reddit r/ClaudeCode, 1x776ms).

## What Changes

- The `session.compact` hook builds the compaction with no model call. Its messages are one handoff message in a fixed format, then the newest messages word for word, by `handle`, up to a token budget. On an error or an empty result, it calls `next(e)`, so the built-in compaction stays the fallback.
- The handoff format has fixed `##` sections. A section for constraints and pins holds each "do not", each pinned version, and each decision of the user, word for word with its source.
- The same text goes to `.claude/claudetto/handoffs/` as a file, so `/clear` and a new session can resume from it.
- The text holds no system notification as a message of the user. A rule never appears twice. Each list has a cap.
- A paid probe compares 3 arms: built-in compaction, code compaction, and the handover of today (`/clear` and resume). When code compaction wins, it becomes the default path, and the `PATH_TABLE` of `modules/session/handoff/limits.ts` changes to match.

## Capabilities

### New Capabilities

- `code-compaction`: the compaction that code builds, its format, its fallback, and the probe that picks the default.

## Impact

- Code: `plugins/claudetto/modules/session/handoff/` (`handover.ts`, `cold.ts`, `limits.ts`, `prompts.ts`, `adapters/mod.ts`), `modules/session/prompt/adapters/mod.ts` (`onCompact`), `hooks/register.ts`, and `modules/session/domain/compaction.ts`.
- Docs: `src/wiki/claudetto/slices/Handoff*.md` and a new evidence page for the probe.
- Cost: the probe is a paid sandbox run, and it runs only after the user approves it with its cost.
