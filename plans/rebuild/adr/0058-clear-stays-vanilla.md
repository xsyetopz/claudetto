---
status: superseded by ADR-0068
date: 2026-11-16
---
# Keep the User's /clear Vanilla

## Context and Problem Statement

The session cycle replaced core auto compaction. The user's own `/clear` had to stay as Claude Code ships it.

## Considered Options

- Register no `command.run` hook that changes `/clear`.
- Register a `command.run` hook that tells a user's clear from a plugin's by `e.origin.kind`, and pass through when `e.origin.kind !== "plugin"`.

## Decision Outcome

Chosen: no `command.run` hook that changes `/clear`; a hook that must tell the two apart passes through when `e.origin.kind !== "plugin"`. Superseded by [ADR-0068](0068-handover-clear-hook.md): a `command.run` hook on `clear` writes the handover, then runs the clear unchanged.

## Consequences

- The vanilla rule no longer holds; a typed `/clear` now writes a handover first.

Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); plans/rebuild-curation.md Session Cycle item, superseded by the Handover section (commit 434bf4cb); user decision, 2026-11-16.
