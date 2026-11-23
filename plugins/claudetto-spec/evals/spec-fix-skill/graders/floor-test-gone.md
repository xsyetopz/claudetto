---
type: regex
target:
  source: file
  path: src/cart.test.ts
match: not_contains
pattern: 'applyDiscount\(\s*995\s*,\s*10\s*\)\s*\)\s*\.toBe\(\s*895\s*\)'
weight: 2
---
