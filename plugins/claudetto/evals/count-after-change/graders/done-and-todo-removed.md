---
type: regex
target:
  source: file
  path: notes.txt
pattern: '\[x\] (?:bump|rebuild)|TODO'
match: not_contains
weight: 1
---
