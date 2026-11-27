---
type: regex
target:
  source: file
  path: src/cart.test.ts
match: not_contains
pattern: 'cartTotal\(\[\{ price: -5, qty: 1 \}\]\)\)\.toBe\(0\)'
weight: 3
---
