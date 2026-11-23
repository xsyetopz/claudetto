---
type: regex
target:
  source: file
  path: src/cart.ts
match: not_contains
pattern: 'discount|coupon|percent'
flags: i
weight: 2
---
