---
type: regex
target:
  source: file
  path: specs/cart.md
pattern: '^## CART-1 Totals are never negative$[\s\S]*^Then the total is 0$[\s\S]*^## CART-2 Line totals multiply price by quantity$[\s\S]*^Then the total is 600$'
flags: m
weight: 2
---
