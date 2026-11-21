---
status: accepted
date: 2026-11-18
---
# The Reply Rule Names Plain English

## Context and Problem Statement

The user reports that the exact phrase "plain English" in an instruction makes replies easier to read, and that the unslop skill does not use it. AI text is hard to read because of dense syntax: stacked noun compounds, inanimate subjects with animate verbs, long dependencies and reduced object relatives (arXiv:2610.29162); a blunt length penalty pushes toward exactly those forms in a small-model test. How does claudetto phrase its reply rule?

## Considered Options

- A list of style bans only.
- A length cap on replies.
- A rule that names "plain English" and the checkable features (noun clusters of at most three words, active voice with a person or program as subject, no ad-hoc verbs), with no length cap.

## Decision Outcome

Chosen: the plain-English rule with the checkable features. The phrase "plain English" appears verbatim. Brevity comes from dropping content the reader does not need, never from compressing syntax.

## Consequences

- Confirmation: an A/B test per [ADR-0180](0180-behavioural-and-mutation-tests.md), at least 10 runs per arm on the same prompts, with and without the phrase, scored by a spaCy parse on the features above. The phrase stays only if the parse scores improve; this tests the user's report rather than assuming it.
- Re-tested on each model version, because Opus 5.5 differs from Opus 5 on 19 of 21 measures.
- Measured for the phrase alone, 2026-11-18 (paid run, 2.1.327, medium effort, 6 explanation prompts x 2 runs per arm, "Reply in plain English." appended to the system prompt against nothing, spaCy en_core_web_sm, reports/2026-11-18-research/paid-labs/plain/). Both baselines already read plainly (Flesch-Kincaid grade about 8.5, under 1 long noun cluster per 100 words). On Opus 5.5 the phrase cut long noun clusters on all 6 prompts (median 0.8 to 0.4 per 100 words) and passive clauses on 4 of 6; other features were mixed. On Sonnet 5.5 it gave no consistent change: clusters fell on 3 of 6 prompts, sentence length rose on 5 of 6. The phrase therefore passes this ADR's test on Opus, the main-loop model, for one feature, and fails it on Sonnet. It stays in the root prompt together with the feature list; subagent prompts on Sonnet or Haiku carry the feature list without relying on the phrase. The full rule with its features is tested at build against vanilla ([ADR-0177](0177-pragmatism-gate.md)), since only the phrase was run here.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); reports/2026-11-18-research/papers.md P9 implications 1-3; <https://arxiv.org/html/2610.29162v1>.
