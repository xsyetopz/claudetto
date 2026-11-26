---
type: regex
target:
  source: file
  path: .git/COMMIT_EDITMSG
pattern: '^[^\n]+\n(?:\n*[^#\n][^\n]*(?:\n|$)){2,}'
weight: 2
---
