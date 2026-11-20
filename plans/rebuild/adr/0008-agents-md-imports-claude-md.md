---
status: accepted
date: 2026-11-05
---

# AGENTS.md Stays an Import of CLAUDE.md

## Context and Problem Statement

Where do agent instructions for non-Claude tools live? The repo had `claudekit/`.

## Considered Options

- `AGENTS.md` holds `@CLAUDE.md`.
- `AGENTS.md` holds its own text.

## Decision Outcome

Chosen (2026-11-05): `AGENTS.md` stays `@CLAUDE.md`. `claudekit/` left the repo in commit `e20d11df` (task 17.13).

## Consequences

One instruction file, `CLAUDE.md`.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2062; user decision, 2026-11-05.
