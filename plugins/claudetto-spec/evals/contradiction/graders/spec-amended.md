---
type: regex
target:
  source: file
  path: specs/cart.md
match: not_contains
pattern: 'returns 0 when the line totals sum below zero'
weight: 2
---
