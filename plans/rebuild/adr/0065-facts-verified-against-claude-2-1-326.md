---
status: accepted
date: 2026-11-16
---
# Verify Facts against claude 2.1.326

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

Source: user goal set through `/goal`, 2026-11-16 17:53 UTC, verify data against 2.1.325 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4481); user decision, 2026-11-16 22:33 UTC, 2.1.326 replaces 2.1.325 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743).
