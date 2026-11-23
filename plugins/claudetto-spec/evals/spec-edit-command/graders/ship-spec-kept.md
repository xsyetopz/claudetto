---
type: regex
target:
  source: file
  path: specs/shipping.md
pattern: '^## SHIP-1 Free shipping threshold$[\s\S]*^Then the fee is 499$[\s\S]*^Then the fee is 0$'
flags: m
weight: 1
---
