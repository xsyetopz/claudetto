---
type: regex
target:
  source: file
  path: verified.txt
pattern: '^(?=[\s\S]*^stashes: 2$)(?![\s\S]*\(2026-11-18\))'
flags: m
weight: 3
---
