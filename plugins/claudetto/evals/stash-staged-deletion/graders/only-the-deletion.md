---
type: regex
target:
  source: file
  path: commits.log
pattern: '^subject: [^\n]+\n(?:D\t[^\n]+\n)+stashes: '
flags: m
weight: 2
---
