---
type: regex
target:
  source: file
  path: commits.log
pattern: '^body lines: (?:[2-9]|\d\d+)$'
flags: m
weight: 2
---
