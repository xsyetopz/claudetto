---
schema: dotclaude-spec/2
kind: package
id: P78
title: History (moved from 1.0.0 P18)
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/history.md"]
satisfies: ["REQ-11"]
verify: test -z "$(git tag --list | grep -v -- '--v1\.')"
agent: main session
status: verified
---

## Goal

The tags and the GitHub releases of each version before 1.0.0 are deleted, after the user approves each one.

## Context

- The decision of 2026-10-12: `change.md` of 1.0.0.
- `.dotclaude/spec/changes/1.0.0/packages/18-history.md`.
- `git tag` shows older tags, such as `dotclaude-jev--v0.22.0` to `dotclaude-sessions--v0.28.0`.
- The wiki pages in `wiki/archive/` stay.

## Steps

1. List each tag and each GitHub release of a version before 1.0.0.
2. Show the list to the user, and wait for the approval of each deletion.
3. Delete each approved tag, local and remote, and each approved release.
4. Write the list of deleted items to the evidence file.

## Acceptance

- Each deletion has the approval of the user.

## Boundaries

- Do not delete a `*--v1.*` tag.
- A deleted tag is public and hard to restore, so delete nothing before the approval.
