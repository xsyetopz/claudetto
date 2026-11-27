---
type: regex
target:
  source: file
  path: .git/index
pattern: 'scratch\.log'
match: not_contains
weight: 2
---
