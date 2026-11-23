---
type: regex
target:
  source: file
  path: src/cart.ts
match: not_contains
pattern: 'discount|percent'
flags: i
weight: 3
---
