---
paths:
  - "CHANGELOG.md"
  - ".claude-plugin/**"
  - "plugins/*/.claude-plugin/**"
---

Add CHANGELOG entries under the section of the version in the manifests when `main` does not have that version yet, because it is the release in progress.
The merge into `main` is the release, and the repository makes no tags.
Otherwise add them under `[Unreleased]`.
Change versions with `just bump`.
