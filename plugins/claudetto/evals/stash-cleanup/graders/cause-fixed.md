---
type: regex
target:
  source: file
  path: src/money.ts
pattern: 'Math\.max\(1, qty\)'
match: not_contains
weight: 1
---
