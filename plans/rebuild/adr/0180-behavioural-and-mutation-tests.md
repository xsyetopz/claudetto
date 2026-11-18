---
status: accepted
date: 2026-11-18
---
# Behavioural Tests on Traces and Mutation of Plugin Rules

## Context and Problem Statement

The goal asks for objective verification, behavioural tests and mutation testing. [ADR-0087](0087-product-first-no-benchmarks.md) named mutation scoring as a past violation because it was run as a score to raise. TDAD (arXiv:2603.08806) shows a working form: deterministic assertions on tool-call traces, mutation of the agent's rules with a check that each mutant activates, hidden tests graded in a separate session, and repeated runs because pass rates vary by 4 to 16 points. Two further papers show that the same model behaves differently across harnesses (arXiv:2605.15184, Opus 93.1 vs 76.7) and across model versions (arXiv:2610.29162, Opus 5.5 vs Opus 5 on 19 of 21 measures). How does claudetto test behaviour?

## Considered Options

- No behavioural tests; code unit tests only.
- Mutation scoring as a target (rejected by ADR-0087).
- Trace assertions plus mutation of each plugin rule, used as a kill check, never as a score.

## Decision Outcome

Chosen: trace assertions plus rule mutation.

- Each plugin rule that changes model behaviour (pushback, evidence before revert, reply register) has a behavioural test that asserts on the tool-call trace or a parser-checkable text feature, not on an LLM judge's opinion.
- Each such rule has at least one mutant (the rule deleted, or inverted, such as "agree after pushback" or "skip verification"). The test must fail on the mutant; a mutant that leaves the trace unchanged shows that the rule does nothing and the rule is removed ([ADR-0177](0177-pragmatism-gate.md)).
- Each test runs at least 10 times per arm, varies the prompt phrasing (cousin prompts, pass only when all phrasings pass; ACL 2026.acl-long.354) and the user's stated certainty (arXiv:2602.23971), and is re-run on each new model version and Claude Code version.
- Code mutation (Stryker, mutmut) applies to the hook code as a kill check on the tests that cover it. A surviving mutant leads to a test or to deleting dead code; no mutation score is reported or targeted.

Supersedes the mutation part of [ADR-0087](0087-product-first-no-benchmarks.md); its no-benchmark rule stands.

## Consequences

- Good: a rule that the model ignores is found and deleted instead of carried.
- Bad: 10 runs per arm cost tokens; Haiku 5.5 runs are used where the rule is model-independent, and the run cost is reported with the result.
- Not adopted: sample-and-select with a checker (ACL 2026.acl-long.354 implication 3). Its gain is shown only for constraints a program can check, and each sample costs a full turn; it ships only through [ADR-0177](0177-pragmatism-gate.md).
- QS-013 changes from "tests proven by mutation" as a score to the kill check above.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); reports/2026-11-18-research/papers.md P8 implications 1-4, P7 implication 3, P9 implication 3; https://arxiv.org/pdf/2603.08806; https://arxiv.org/pdf/2605.15184; https://arxiv.org/html/2610.29162v1.
