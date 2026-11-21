---
status: accepted
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:137 (day of decision not recorded)
---
# Compaction Keeps Its Default Window

## Context and Problem Statement

Setup wrote `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` and `autoCompactWindow: 300000`, and D321 kept "setup writes `autoCompactWindow`". Together they compacted every 140-150k tokens (measured).

`settings.ts:114` writes `100_000` for Haiku; 200000 comes from an outside post. The price step is verified: Haiku 5.5 bills prompts over 100,000 tokens at 5x for input, output, cache writes and cache reads ($0.10 against $0.50 input; platform.claude.com `models/haiku-5-5/overview`, Pricing, read 2026-11-17).

Options posted: `autoCompactWindow=300000; CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=75` or `autoCompactWindow: 400000` against the default of about 967K on 1M models. One user: context per request 412K to 219K (cost -38%) and 415K to 220K (-43%; summaries rose from 16 per month to 75 per week at about 76 s each, files re-read after); 66% of one user's main-thread cost came above 400K; at a 200k threshold input and post-compact cache write are about 5x smaller; three auto-compacts read about 970k tokens to keep about 12k (1.1-1.6% kept, 72-237 s). Follow-up (Pro, one user): compacting at 200k cut re-read share of spend 56% to 28% and cost per call by half, but 53% more calls per prompt and 19 re-reads, net 26% cheaper per prompt; cache rebuild about $0.20 per compaction; 56 cold returns in 30 days cost $111. Haiku 5.5 benchmark (100K window, medians): day of work -19% cost and -33% time, eval harness -35% and -28%, short task +6% and -17%. Counter: compacting at 125k is not cost-efficient; handoff beats autocompact; force 250k instead of 1M (one poster burned 20x in 2 days at 1M); middle path: compact around 300-400k and tell the model a minute ahead to flush state. The "autocontext is thrashing" error fires when context refills within 3 turns of an auto-compact 3 times in a row. `compact_boundary` records in session JSONL carry `compactMetadata.trigger`, `preTokens`, `postTokens`, `durationMs`.

## Considered Options

- Keep both keys.
- Stop writing both and keep the default window; only Haiku agents get a window.
-      1.
-      1.
- Default window (about 967K).
- A 200k window.
- A 300k or 400k window.
- Handoff at 150-250k (see the handover requirements).

## Decision Outcome

Haiku 5.5 is held to at most 100,000 tokens per request, because each token past 100,000 bills 5x (user decision, typed turn 2026-11-17). Probe (2.1.326, cc-inspect `cli` `/context`, haiku-5-5): the autocompact buffer is a fixed 33k, so `autoCompactWindow: 100000` fires compaction near 67,000 (`133000` would fire at 100,000). `100000` stays: the compaction request itself sends the whole history plus the summary prompt, so a threshold at 100,000 would bill that request above the step. A step inside a turn can still cross 100,000 before the next check; the tool-result withhold on haiku-5-5 (pass tokens over 100,000) closes that gap.

Chosen: stop writing both (D323 supersedes D321). Haiku 5.5 keeps `autoCompactWindow: 100000`, the lowest value the frontmatter accepts.

Same decision, other record: 100000 until a pricing page read settles it.

Not decided in the old plan. The only fixed part: Haiku keeps `autoCompactWindow: 100_000` (baseline). The settled decision that handover replaces core auto compaction by default governs the rest; setup does not write 300000 (see [ADR-0161](0161-setup-autocompact-env-removed.md)).

## Consequences

- The status line reads the window from the line file, not from stdin.
- The brief's claim of a 200000 Haiku window in the D323 setup text is in no source: design.md:97, setup/spec.md:272 and tier-profiles/spec.md:32 all say 100000.

Revisit when a pricing page is read.

Evidence is measured by the authors on their own data, not controlled. 2.1.325: setting `autoCompactWindow`, `modelSettings.*.autoCompactWindow` 100000-1000000 or "auto", flag `--autocompact <auto|tokens>`, `/autocompact`, env `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `autoCompactEnabled`, `DISABLE_AUTO_COMPACT` present. Baseline: partial (`setup/settings.ts` Haiku 100_000; `agents/Artemis.md`).

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:137; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:52; openspec/specs/setup/spec.md:272; unresolved: the 200000 Haiku window is in no source; plugins/claudetto/hooks/features/setup/settings.ts:114@088a227c; the outside post is not named by the old plan; external/2026-11-06/reddit.com-r-anthropic-comments-1xo46kx-compacting-at-400k-instead-of-9-20261105T173015Z.md:37 (url: <https://www.reddit.com/r/Anthropic/comments/1xo46kx/compacting_at_400k_instead_of_967k_cut_my_claude/>); external/2026-10-17/export-Follow-up on the 56% re-reading post- a week of compacting at 200K halved re-reading, but the real s.jsonl:2 (<https://www.reddit.com/r/ClaudeAI/comments/1x62hgo/>); external/2026-10-12_p3/export-How's 1m context window now-.jsonl:2; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:134.
