---
status: accepted
date: 2026-11-16 (date of the handoff that records it; day of decision not recorded)
---
# The Rebuild Goes On An Orphan Branch That Holds Only The Plan

## Context and Problem Statement

The branch `feat/2.1.325-rearchitecture` is decommissioned in favour of `feat/claudetto-2.1.325-reinstantiation`.

Transcript record tx-x02/restore-no-more-old-files: The orphan branch dropped files the user did not tell the agent to drop. The agent restored only .gitignore. The user was asked whether to restore more (.editorconfig, justfile, AGENTS.md).

## Considered Options

- Orphan branch with the plan only.
- Another layout (options not listed in the summary).
- Restore more.
- Nothing more.

## Decision Outcome

Chosen: Chosen by the user through `AskUserQuestion`: "Orphan, plan only"; old branch: "Delete local only". Later answer: restore nothing more from `088a227c`.

## Consequences

The old tree stays at `088a227c` on `origin/feat/2.1.325-rearchitecture`. The user also objected that the orphan dropped `.gitignore`; only `.gitignore` was restored.

Transcript record tx-x02/restore-no-more-old-files decided: nothing more. The whole old tree stays at 088a227c on origin. The rebuild starts small.

Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738.
