---
status: rejected
date: 2026-11-26
---

# Decisions Go to Jev First, With a Haiku Fallback

## Context and Problem Statement

TypeSafe Jev is a decision model: it rates a statement about some state with a probability (a Noul, 0 to 1), answers in 147 to 220 ms warm, and costs $0.042 per million input tokens. The proposal put two plugin decisions on Jev, with Haiku 5.5 at high effort answering the same statements only when Jev fails:

1. `claudetto` pre-decide on `prompt.submit`. Jev rates `asks_verdict_only` (the prompt asks whether an idea is good and not for the change) and `states_checkable_fact` (the prompt states a project fact the files could contradict). A rating at or above 0.7 adds a note beside the prompt: give the verdict first and edit nothing, or check each stated fact against the files.
2. `claudetto-you-should-know` recheck. Jev rates `note_no_longer_holds` against the shown note and the tail of the agent's reply text, and a yes withdraws the note.

The key is `TYPESAFE_API_KEY`; with it set, prompt text and reply text go to a third party. ADR-0177 ships a component only when a measured run beats its baseline. Does the Jev step beat the same code without it?

## Considered Options

- Keep decisions as they are: no pre-decide step, and the recheck on the forked Claude turn.
- Jev first with a Haiku fallback at both sites (branch `feat/jev-first-decisions`, PR #281).
- A Jev hook on every gated tool call (the shape ADR-0144 rejected).

## Decision Outcome

Chosen: keep decisions as they are. The A/B below shows no gain from the Jev step, and the step adds a third-party data flow and 150 to 220 ms per typed prompt. PR #281 closes unmerged. ADR-0144, ADR-0137 and ADR-0053 stand unchanged.

## Consequences

- Good: no prompt or reply text leaves the machine for a decision, and the prompt path keeps one secret check and no network call.
- Bad: the recheck keeps the forked Claude turn, the costlier call; the you-should-know plugin has no eval suite in the repo, so the recheck change had no measured run either way.
- Strongest counterargument: the 0.7 and 0.3 thresholds were unmeasured starting values on these questions; better state or questions might show a gain. In the 2026-11-25 probe, `states_checkable_fact` sat at 0.41 to 0.64 on four of twelve prompts, which the table read as no change.

Verified: A/B of the PR #281 code with and without `TYPESAFE_API_KEY`, claude 2.1.329, Haiku 5.5 high, 2026-11-26. The note reached the model (`claude -p` probe: the model quoted the verdict note). Full claudetto suite, n=3: keyed 0.934, $0.41, 451 turns (run 2026-11-26T00-25-15-454Z); unkeyed 0.938, $0.41, 463 turns (2026-11-26T00-53-54-003Z); vanilla 0.793 to 0.805, $2.20 to $2.21. wrong-design-pushback, n=5: 0.70 in both arms. dispute-checkable, n=5: keyed 0.92, unkeyed 0.97.

Verified: live probe, 12 synthetic prompts, 2026-11-25. Jev jev-1.14.0: 203 ms cold, 147-220 ms warm (median 161 ms), 364-374 input tokens per call, 0.000186 USD in total.

Source: ADR-0177; ADR-0144; ADR-0137; PR #281; user decision through AskUserQuestion, 2026-11-26 (close PR #281 and keep this record).
