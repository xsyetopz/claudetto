---
type: regex
target:
  source: file
  path: .git/COMMIT_EDITMSG
pattern: '^[^#\n]{101,}$'
flags: m
match: not_contains
weight: 3
---
