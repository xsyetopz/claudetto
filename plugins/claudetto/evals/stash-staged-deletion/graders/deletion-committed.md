---
type: regex
target:
  source: file
  path: .git/index
pattern: 'src/ExeExtractor\.ts'
match: not_contains
weight: 3
---
