---
paths:
  - "CHANGELOG.md"
  - ".claude-plugin/**"
  - "plugins/*/.claude-plugin/**"
---

Add CHANGELOG entries under the section of the version in the manifests when that version has no tag yet, because it is the release in progress.
Otherwise add them under `[Unreleased]`.
Change versions with `just bump`.
