---
type: regex
target:
  source: file
  path: notes.txt
pattern: '\r|\n\n|[ \t]+(?:\n|$)'
match: not_contains
weight: 1
---
