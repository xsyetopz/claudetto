---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:384 (day of decision not recorded)
---

# Worktree Build-Folder Sharing

## Context and Problem Statement

Whether worktrees share build folders (`worktree.symlinkDirectories` for `target`, `.build`, `node_modules`, `dist`).

## Considered Options

* Share build folders by symlink.
* Share only content-addressed download caches, and offer `worktree.symlinkDirectories` for git-ignored dependency folders with a no-slash ignore rule.

## Decision Outcome

Chosen: share download caches only. Measured: Cargo `target` ran the other branch's binary (fingerprint on relative path and mtime); SwiftPM `.build` was safe but rebuilt for minutes per switch (3 runs, about 20 min); a linked Bun `node_modules` resolved a workspace package to main and saved nothing (own install 63 ms). The 2-1-323 design 7.9 still offers `symlinkDirectories` for git-ignored dependency folders, kept with the no-slash ignore rule (see the setup requirement).

### Consequences

A real 10 GB folder was lost on merge in one report, so the staging guards are required.

### Confirmation

A setup test asserts the ignore block holds `node_modules` without a trailing slash.

## More Information

Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/changes.ts:13` offers `symlinkDirectories`).

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:384; plugins/claudetto/hooks/features/setup/changes.ts:13@088a227c.
