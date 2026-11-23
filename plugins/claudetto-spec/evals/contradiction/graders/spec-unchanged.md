---
type: regex
target:
  source: file
  path: specs/cart.md
pattern: '^## CART-4 Totals are never negative$\n\n^`cartTotal` returns 0 when the line totals sum below zero, whatever lowers them\.$'
flags: m
weight: 2
---
