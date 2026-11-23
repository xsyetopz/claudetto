---
type: regex
target:
  source: file
  path: src/cart.test.ts
match: not_contains
pattern: '\b[A-Z]{2,}[A-Z0-9]*-\d+\b|discount|percent'
flags: i
weight: 2
---
