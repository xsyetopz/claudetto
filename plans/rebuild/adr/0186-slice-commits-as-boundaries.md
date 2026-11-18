---
status: accepted
date: 2026-11-18
---
# Slice Commits Are the Context Boundaries

## Context and Problem Statement

Material the user gathered through Gemini argues for committing work in small revertible slices and using each commit as a context boundary. Checked against the docs and the program on 2026-11-18:

- Holds: the pricing multipliers it cites (platform prompt-caching page); checkpoints are not version control, do not track Bash-only file changes, do not restore subagent edits (except a foreground forked skill), skip symlinks, and keep 100 checkpoints swept after `cleanupPeriodDays` (code.claude.com/docs/en/checkpointing); dynamic git state in the cached prefix breaks the cache on every commit; renewal belongs at slice boundaries, not edit boundaries.
- Partly wrong: "/compact invalidates the cache". The compaction call reads the cached prefix (chunk-m14bt1pz.js@2958807); only the summary tail is written afresh.
- Partly wrong: "/clear costs nothing". The command is free, but the next turn writes the new tail.
- Holds: "/rewind keeps the cached prefix". After a rewind the next request carried the same tools, system and earlier messages byte for byte (CTX-844). Rewind also refills the input box with the rewound prompt, so new text is appended to it.
- Unverifiable here and not used: the Azure study, the 14.5% requirement-keyed recovery figure, the 40% revert claim, the GitHub 7.38B figure, Scion.

How do commits relate to session renewal?

## Considered Options

- Rely on checkpoints for undo.
- Commit each verified slice locally; treat the commit as the boundary signal of [ADR-0178](0178-renewal-at-task-boundaries.md); squash before push.

## Decision Outcome

Chosen: commit per verified slice. A slice is one change whose check passed. The commit is local; the user's branch history is squashed or kept as the user decides before any push. The commit is a boundary signal for renewal, which still needs the break-even size of ADR-0178. Git state (`git status`, HEAD) enters the handover text, never the cached system prefix.

## Consequences

- Undo of a bad slice is `git revert` of one commit, which covers Bash-made changes that checkpoints miss.
- No commit is pushed without the user's instruction.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:671); https://code.claude.com/docs/en/checkpointing (fetched 2026-11-18); https://platform.claude.com/docs/en/build-with-claude/prompt-caching (fetched 2026-11-18); chunk-m14bt1pz.js@2958807 (claude 2.1.327).
