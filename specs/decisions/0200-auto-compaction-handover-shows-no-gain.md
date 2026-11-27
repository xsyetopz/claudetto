---
status: proposed
date: 2026-11-24
---

# Auto-Compaction Handover Shows No Gain on 2.1.329

## Context and Problem Statement

ADR-0143 made claudetto's handover answer Claude Code's automatic compaction by default, and HANDOVER-060 states the reason as cost: a fork over the cached prefix at half the price of a core compaction. ADR-0177 ships a component only when a measured run shows it beats vanilla. On claude 2.1.329 (Sonnet 5.5, 2026-11-24, `reports/2026-11-24-research/pin-2-1-329/handover/results.txt`), six sessions per arm that auto-compacted two or three times each cost $0.494 on average with the handover and $0.467 with core's summarizer. Each handover fork read 14.3k tokens from cache and 21.3k uncached, against core's 29.2k and 20.9k. The handover also keeps the turn's pending tool result after itself, so the next context starts at 11.5k tokens against core's 3k, and core's thrashing stop ended 2 of 6 handover sessions and 0 of 6 core sessions on a 60k or 70k window. Should the handover keep answering automatic compactions?

## Considered Options

- Keep ADR-0143: the handover answers `auto` and `precompute`, as shipped.
- Leave `auto` and `precompute` to core's summarizer, and keep the handover for the `/clear` and the task-boundary renewal (trigger `plugin`).

## Decision Outcome

Proposed: the second option, because the measured runs show no cost gain and a failure that core does not have. ADR-0143 is the user's decision, so the shipped behaviour stays as it is until the user reviews this record. Accepting it changes `AUTOMATIC` in `plugins/claudetto/hooks/handover/compact.ts` to `plugin` alone, drops the `precomputeHandoverEnabled` knob and its README row, and moves the auto-trigger tests of `compact.test.ts` to core's path. Rejecting it keeps ADR-0143 and leaves HANDOVER-060's cost claim Out as unmet.

## Consequences

- The runs used a small window to force compactions; at the default 1M window of Sonnet 5.5 auto compaction is rare and the thrashing stop is less likely, but the per-compaction cost holds at any window.
- The handover's other claims (the user's words kept verbatim, git state) had no run against core here; on the lowercase-format prompt both arms kept the format in every session that finished.

Source: `reports/2026-11-24-research/pin-2-1-329/handover/results.txt`; ADR-0143; ADR-0177; HANDOVER-060.
