---
id: P18
deps: [P16]
owns: ["wiki/archive/"]
verify: the user approves each deletion before it runs
agent: implementer
---

# P18 History

## Goal

Delete the tags, the GitHub releases, and the wiki release pages of each older version.

## Context

- The entry: `spec/changes/1.0.0/packages.md:188-190`.
- The wiki release pages of this checkout are in `wiki/archive/`, one file for each version, such as `wiki/archive/Release-0.28.md`.
- The tags and the GitHub releases are not in the repository.
  The `owns` entry names the only repository path that the deletion changes.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. List each tag and each GitHub release of an older version, and each file of `wiki/archive/`.
2. Show the list to the user, and wait for the approval of each deletion.
3. Delete each approved tag, release, and wiki release page.

## Acceptance

- Each deletion has the approval of the user, and the list of the deleted items is in the report.
- `wiki/archive/` has no deleted file that the user did not approve.

## Boundaries

- Change only the paths of `owns`, and the tags and releases that the user approves.
- Do not delete a tag or a release before the approval, because a deleted tag or release is public and hard to restore.
