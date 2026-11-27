---
type: regex
target:
  source: file
  path: summary.md
pattern: '`?sync`?[^\n]*(?:removed|gone|dropped|no longer)|(?:removed|dropped)[^\n]*`?sync`?'
flags: i
weight: 2
---
