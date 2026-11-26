---
type: regex
target:
  source: file
  path: matrix.log
pattern: 'NO OUTPUT'
match: not_contains
weight: 3
---
