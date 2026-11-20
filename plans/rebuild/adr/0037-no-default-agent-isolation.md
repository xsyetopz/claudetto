---
status: accepted
date: 2026-11-13
---

# No Default Isolation in the Agent Frontmatter

## Context and Problem Statement

Should an agent file set isolation "worktree" by default, so each call runs in its own worktree?

## Considered Options

- Set a default isolation in the agent frontmatter.
- Rewrite the input of an Agent call from a guard.
- Tell the model in text when to use isolation, and set nothing.

## Decision Outcome

Chosen option: text only. A default isolation would send each Heracles call, including one that edits for the lead with no commit, to a worktree whose changes the lead's tree never sees. A guard that rewrites the input is out, because a rewrite voids auto mode's review.

## Consequences

- The lead's tree sees edits of an editing subagent.
- The model reads when to ask for isolation from text, as at the baseline (plans/rebuild-curation.md:434).

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:808-809 (P155; reasoned, not run).
