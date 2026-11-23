---
type: regex
target:
  source: file
  path: notes.txt
match: not_contains
pattern: '\[x\] (?:bump|rebuild)|todo'
flags: i
weight: 1
---
