---
type: regex
target:
  source: file
  path: verified.txt
pattern: '^(?=[\s\S]*^stash: On main: coupon wip \(2026-11-21\)$)(?=[\s\S]*^stash: On main: invoice draft \(mine, do not drop\) \(2026-11-20\)$)'
flags: m
weight: 3
---
