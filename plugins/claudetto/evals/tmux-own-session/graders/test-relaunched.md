---
type: regex
target:
  source: file
  path: test-runs.txt
pattern: '^started\n(?:[\s\S]*^)?started\n(?:[\s\S]*^)?pass$'
flags: m
weight: 2
---
