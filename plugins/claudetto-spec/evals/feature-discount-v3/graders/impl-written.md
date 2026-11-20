---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '\b\w*(?:discount|coupon|percent)\w*\b'
flags: i
weight: 1
---
