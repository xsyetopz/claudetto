---
status: accepted
date: 2026-11-16
---
# Verify Facts Against claude 2.1.326

## Context and Problem Statement

Findings from the old OpenSpec and the dossier were written for older versions. The target was 2.1.325 until the user replaced it with 2.1.326.

## Considered Options

- Trust the source text.
- Verify each fact against `claude` 2.1.326.
- Verify each fact against `claude` 2.1.325 (the earlier target).

## Decision Outcome

Chosen: verify each fact against `claude` 2.1.326, which replaces the 2.1.325 target (user decision, 2026-11-16).

## Consequences

An "absent" mark needs a literal whole-build `code` search (see the risk of one-kind `surface` queries).

Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; user decision, 2026-11-16, session 0342617c jsonl:10743 (2.1.326 replaces 2.1.325).
