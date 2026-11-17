---
status: accepted
date: recorded in external/please-use-me-often/agent-failure-dossier/judged/spec.jsonl:3 (day of decision not recorded)
---
# Route Model By Cost Of A Wrong Answer

## Context and Problem Statement

Which model plans, implements, reviews, and does mechanical work? Reports disagree: some pay for Opus rather than have Opus clean up after Sonnet; some keep Sonnet implementing from a strong plan. Reported, contested.

Which model leads and which implements, and whether a second model reviews.

## Considered Options

- `plan=strongest(Opus|Fable); implement=Sonnet|Opus; review=Opus|Fable; mechanical=Haiku|script`.
- A thinker-planner-typist chain (disputed, no consensus; measure per workload).
- Opus alone (an Opus-plus-Opus-review run cost more and took longer than Opus alone on both tasks of one measurement).
- Strongest model plans, cheaper model implements, executor model written into each plan; the main stays a thin low-effort dispatcher.
- Stack a lead on itself (Opus managing Opus looped on "I caught myself doing something wrong"; Fable managing Opus worked better, reported).
- Orchestrator Opus delegating everything (about equal cost to Opus alone, measured by one poster).
- Optional second-model review in the plan phase, with a plan step that presents options with a case for each before the user approves (Anthropic study cited secondhand: analysts followed a hidden lean 86%; serious errors 6% with an agent against 55% without, n=11).

## Decision Outcome

Chosen: route by the cost of a wrong answer. Sonnet implements from an explicit plan (exact files plus acceptance checks, one step at a time) and fails on vague plans (invents names, takes shortcuts). Fable serves big planning, security-sensitive review, and unsticking loops, as a read-only adversarial reviewer that never blesses. Haiku takes mechanical predefined work, not intent. The plan file carries what execution needs, since planning context is not minimal execution context. Orchestrator effort high with spawned agents low (one report). Fable and Opus are never a subagent model (settled decision), so the plan's "Opus implements" and "Opus reviews" apply to the main thread only.

Same decision, other record: the first option. A high-effort Opus main that reads full subagent output pays Opus on every later turn; a premium model is escalation-only (a Fable to Opus orchestrator swap raised errors to about 31% from 11%, reported); a reviewer is of a different model tier than the author (blind spots differ; another poster says never tell main to audit capable agents, contested). Task tiers: 1 quick fix on the main thread, 2 developer subagent, 3 core logic by subagent plus review. Fable writes a test or brief instead of reading all subagent output (about 40% Fable and 25% Opus use, reported). A second model reviewing the plan is said to catch blind spots (one claim about 95%, with a speed cost) against the practice of a separate reviewer; the choice stays open until measured.

## Consequences

- Agent files at 088a227c set model and effort (Artemis, Athena, Heracles, Metis); the blind-tester and read-only reviewer roles are missing.
- Per-workload measurement stays open for chains.

Added evidence (plan line 1365, reported unless noted): route by step type, not task size: lookups, searches, and call-site finds go to a cheap model; anything ending in judgment (review, verification, ship-safe) stays on Opus; cheap-worker output is verified; a TDD-all-to-Opus rule was 20% of spend. Opus 5.5 made 12 hard and 7 minor violations in a 17-slice test refactor against 2 hard and 0 for Sonnet 5.5 (edits go to Sonnet workers). Blind bench: Opus 99/100 at $0.417 median, Haiku 94 at $0.020, Sonnet plus Haiku subagent 90. Haiku 5.5 is a mechanical worker (retrieval returning filenames and line numbers, classification, summaries, JSON formatting, bulk rewrites, log parsing, defined tests) on one file and one check with specific instructions; the plan must say "when plan and code disagree, ask the user". Its tokenizer takes about 40% more input tokens, so "75% cheaper" does not hold per task (measured by one user).

The reviewer role on another model is missing at the baseline.

## Confirmation

An inspection of the agent files shows the executor model per role.

Source: external/please-use-me-often/agent-failure-dossier/judged/spec.jsonl:3; external/2026-11-16/reddit.com-r-claudecode-comments-1xwmeln-psa-superpowers-skill-with-opu-20261115T134532Z.md:103 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwmeln/psa_superpowers_skill_with_opus_ruined_my_codebase/) (https://www.reddit.com/r/ClaudeCode/comments/1xwmeln/psa_superpowers_skill_with_opus_ruined_my_codebase/); plugins/claudetto/hooks/features/agent-model/model.ts@088a227c; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:71; unresolved: no source line located for this claim.
