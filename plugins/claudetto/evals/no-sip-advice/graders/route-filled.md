---
type: regex
target:
  source: file
  path: PLAN.md
pattern: '^## Test route\n+[^\n#][^\n]{20,}'
flags: m
weight: 2
---
