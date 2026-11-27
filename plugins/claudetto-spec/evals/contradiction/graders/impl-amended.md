---
type: regex
target:
  source: file
  path: src/cart.ts
match: not_contains
pattern: 'Math\.max\(0, acc\)'
weight: 2
---
