---
status: accepted
date: 2026-11-17
---
# Sycophancy Mitigation Options

## Context and Problem Statement

Which mitigation does claudetto test against sycophancy? The research note ranks six A/B options as hypotheses with no run; nothing was measured on Opus 5.5, and no paper tests a system-reminder injection.

## Considered Options

* Evidence-before-reversal rule plus a PreToolUse gate on reversing edits after a user accusation, tracking the true-accusation fix rate. CAVE-Bench (365 tasks, 14 models): the rule cut false-confession 37.57 to 16.32, replayed harm 34.38 to 11.38 and over-correction 41.89 to 13.15 (pooled over two non-Claude backbones); a PreToolUse gate on live signals gave replayed harm 8.88 (about 74% cut); Sonnet-5 baseline false confession 3.53%, over-correction 12.50%; the paper gives no cost on true accusations; the ADR-0177 test is the check. The only runtime-enforcement result.
* Verify-then-claim premise check (FixedBench: reproduce-first with abstaining framed as success raised correct abstention Sonnet-4.6 65.0 to 80.5 with no Resolved regression, 72.5 against 72.0; on Partial tasks wrong abstention rose 70.7 to 81.3% and 77.3 to 93.6%; reproduce-first alone did not help).
* Pinned ledger of checkable predicates with an update step on revocation (StateTrack-Bench: Sonnet-4-6 88.0 to 96.0 at depth 12, but a revoked rule was enforced 74.3% of the time until the ledger was updated first, then 0.0%). Argues for a constraint ledger, which is out of scope; kept as an option only.
* Claim-only one-step reframing, never for instructions (Dubois: questions and non-questions differ 24 pp; third-person rewrite lifted Qwen2.5-7B 1.10 to 4.02 and Claude 3.7 only 4.59 to 4.74; 9 of 11 models worse on false presuppositions, SYCON-Bench; single-turn, not replicated).
* Counterfactual chain of thought only on pushback turns (SWAY score Opus 4.6 1.40 to 0.02 at high commitment, Haiku over-corrected to -0.374; agreement still rises with supporting evidence 42 to 58%).
* Pushback checkpoint that needs new evidence for a reversal.
* Plain anti-sycophancy instruction (over-corrects: ELEPHANT scores go negative; SWAY shows Llama backfires and Haiku and Opus shift toward disagreeing; SYCON Non-Sycophantic lowers turn-of-flip for 5 of 11 models).
* Rejected: self-consistency (GSM8K 76.7% to 88.2% at 9 samples), multi-agent debate (modal sycophancy 26 to 85%, 2.1-3.4x tokens, disagreement collapse 81.7%) and intrinsic critique-then-revise (CSQA GPT-3.5 75.8 to 41.8 after 2 rounds; gains need an oracle signal, Huang 2310.01798).

## Decision Outcome

Chosen option to test first: the evidence-before-reversal rule plus a PreToolUse gate on reversing edits after a user accusation, tracking the true-accusation fix rate (user decision, AskUserQuestion 2026-11-17). The test has a user-is-right arm; the other options stay untested candidates.

## Consequences

* Good, because the six options and their numbers sit in one record.
* Bad, because most 2026 results are single-group preprints with LLM judges, and the Codex CLI "9.6% to 1.4%" claim is unverified.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:13-17 (arXiv 2602.23971, 2505.23840, 2505.13995, 2604.02423); openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:17-22 (arXiv 2509.23055, 2605.00914); openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:24-31 (arXiv 2609.32616, 2502.08177, 2610.31314); openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:62-109; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:161.
