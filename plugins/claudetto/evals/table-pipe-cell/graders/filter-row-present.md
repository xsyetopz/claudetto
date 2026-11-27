---
type: regex
target:
  source: file
  path: docs/commands.md
pattern: '^\|[^\n]*filter[^\n]*a(?:\\\||&#124;|&vert;)b[^\n]*a(?:\\\||&#124;|&vert;)b[^\n]*\|$'
flags: m
weight: 2
---
