---
status: accepted
date: 2026-11-16
---
# The Rebuild Goes on an Orphan Branch That Holds Only the Plan

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

Source: user answer through AskUserQuestion, 2026-11-16 18:53 UTC, orphan rebuild branch (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6124); user answer through AskUserQuestion, 2026-11-16 19:38 UTC, which files the orphan branch keeps (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6960); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738.
