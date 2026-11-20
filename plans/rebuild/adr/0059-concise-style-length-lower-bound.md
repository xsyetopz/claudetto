---
status: accepted
date: 2026-11-16
---
# Keep the Output Style Short, with a Lower Bound

## Context and Problem Statement

An AskUserQuestion about the Concise output style's length offered bounds. The user answered "Keep short, lower bound". The handoff of line 6480 reads it as an upper cap of 1,373 characters and no lower bound; the audit of line 7889 notes the agent removed the lower bound the user kept.

## Considered Options

- Upper cap only.
- Short, with a lower bound.

## Decision Outcome

Chosen: Keep the style short with a lower bound, as the user answered. No numeric floor is set now. At 088a227c `tools/manifest.test.ts:62-72` tests only an upper cap of 1,373 characters, no file holds a 1,356 floor, and `plugins/claudetto/output-styles/Concise.md` is 1,149 bytes, so the earlier 1,356 floor would fail it. A floor needs a measured link between style length and reply quality, which ADR-0177 requires of any component and no run has produced.

## Consequences

No manifest test holds a floor, and [OUT-019](../prd/README.md) drops the 1,373 cap. The decision is revisited when a measured check (ADR-0177) shows that a shorter Concise.md changes reply behavior; the floor is then the shortest length that kept the behavior.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (the answer is relayed in the handoff User's Words).
