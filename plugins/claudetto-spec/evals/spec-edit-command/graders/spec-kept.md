---
type: regex
target:
  source: file
  path: specs/cart.md
pattern: '^## DISC-1 Percentage discount$[\s\S]*in integer cents rounded down;[\s\S]*^Then the total is 899$[\s\S]*^## DISC-2 Discount cap$[\s\S]*^Then the total is 499$[\s\S]*^## DISC-3 Smallest charge$[\s\S]*^Then the total is 1$'
flags: m
weight: 2
---
