---
type: regex
target:
  source: file
  path: verified.txt
pattern: '^(?=[\s\S]*^stashes: 2$)(?![\s\S]*coupon idea)'
flags: m
weight: 3
---
