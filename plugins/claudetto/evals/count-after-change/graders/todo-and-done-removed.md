---
type: regex
target:
  source: file
  path: notes.txt
pattern: '\[x\]|TODO'
match: not_contains
weight: 2
---
