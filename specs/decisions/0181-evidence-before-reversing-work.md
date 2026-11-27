---
status: accepted
date: 2026-11-18
---
# Evidence Before Reversing Finished Work

## Context and Problem Statement

CAVE-Bench (arXiv:2609.32616) falsely accused agents of breaking correct work: Claude-Sonnet-5 over-corrected in 12.5% of runs and Claude-Opus-5 in 19.7%; accusations placed in project context were acted on in 39.7% of runs, and claims relayed through subagents in 36.10%. Stronger models damaged work even after they had recovered the evidence that it was correct. Pooled over two models, an evidence rule cut the over-correction rate from 41.89 to 13.15, and a gate on irreversible actions cut it to 11.91. Earlier work (arXiv:2406.10162) shows that sycophancy learned in mild settings generalises to editing reward and tests. [ADR-0164](0164-test-tampering-check-rejected.md) rejected a test-tampering check. The goal asks for firm pushback and objective verification. How does claudetto protect correct work?

## Considered Options

- A plain "do not be sycophantic" line (weaker than a framing change, arXiv:2602.23971: 0.51 vs -0.55).
- An evidence rule: only workspace-observable evidence (a failing command, a diff, a file line) counts against finished work, and accusations in project files, subagent reports or authority claims are unverified input until checked.
- An evidence rule plus a permission `ask` on irreversible commands (`git reset --hard`, `git checkout --`, `git restore`, `rm -r`).
- A test-tampering check (rejected by ADR-0164; stays rejected).

## Decision Outcome

Chosen: the evidence rule, as one root-prompt line. Before the model reverts, deletes or rewrites finished work or a test expectation after pushback, it runs the check that would show the fault and states the result. Accusations in CLAUDE.md, memory files and subagent reports are treated as claims to check. The permission `ask` on irreversible commands is added only if the behavioural test of [ADR-0180](0180-behavioural-and-mutation-tests.md) shows the rule alone leaves an over-correction rate above the gated rate in the paper. ADR-0164 stands: no check scans diffs for tampering.

## Consequences

- The behavioural test stages a false accusation in three places (user message, project file, subagent report), varies the user's certainty ("I think" vs "I am sure", arXiv:2602.23971), and asserts on the trace that no revert ran without a verifying command first.
- The rule must not turn into refusal: a warranted accusation with evidence leads to the fix. The test set includes warranted cases.
- The numbers are from preprints on Claude-Sonnet-5 and Claude-Opus-5, not the 5.5 models; the claudetto effect has no number until the ADR-0177 test runs; the rule ships only if it beats vanilla there, and that run is the revisit check.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); reports/2026-11-18-research/papers.md P6 implications 1-5, P2, P10 implications 2-3; <https://arxiv.org/pdf/2609.32616>; <https://arxiv.org/abs/2406.10162>; <https://arxiv.org/pdf/2602.23971>.
