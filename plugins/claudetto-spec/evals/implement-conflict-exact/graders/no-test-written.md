---
type: regex
target:
  source: file
  path: src/cart.test.ts
match: not_contains
pattern: 'DISC-\d|applyDiscount'
weight: 2
---
