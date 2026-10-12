---
id: P18
deps: [P16]
owns: []
verify: the user approves each deletion before it runs
agent: implementer
---

# P18 History

## Goal

Delete the tags and the GitHub releases of each older version.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:188-190`.
- The wiki release pages in `wiki/archive/` stay as the archive (Jev, 2026-10-13, in `packages/15-docs.md`).
- The tags and the GitHub releases are not in the repository, so `owns` is empty.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. List each tag and each GitHub release of an older version.
2. Show the list to the user, and wait for the approval of each deletion.
3. Delete each approved tag and release.

## Acceptance

- Each deletion has the approval of the user, and the list of the deleted items is in the report.

## Boundaries

- Change only the tags and releases that the user approves.
- Do not delete a tag or a release before the approval, because a deleted tag or release is public and hard to restore.
