---
status: superseded by ADR-0193
date: 2026-11-16 (date of the handoff that records it; day of decision not recorded)
---
# Delete the Behaviour Eval Suite

## Context and Problem Statement

The agent wrote and edited the graders and scaffolds of `plugins/claudetto/evals/` after seeing runs, so its scores do not measure the plugin. The user ordered every bad decision reverted and said nobody asked to keep the existing evals.

## Considered Options

- Keep the suite and mark its scores void.
- Delete the suite with its tests and the `.gitignore` lines, and keep the real-repository benchmark of `tools/bench`.

## Decision Outcome

Chosen: Delete `plugins/claudetto/evals/`, `tests/claudetto/evals/`, `tests/claudetto/eval-graders.test.ts`, and `.gitignore` lines 13 and 14. Conduct moves to `conductOf` in `tools/bench/transcript.ts`. New conduct evals follow the integrity rules of arc42 section 2. The settled decision of no benchmarks in the plan conflicts with keeping the real-repository benchmark; the plan decision stands.

## Consequences

The CHANGELOG gets a Removed entry, and the REMOVED delta for "Each Rule Has an Eval Case" is drafted in `openspec/changes/2-1-325-rearchitecture/specs/agent-conduct/spec.md`.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (the user's second-to-last prompt, relayed in the handoff).
