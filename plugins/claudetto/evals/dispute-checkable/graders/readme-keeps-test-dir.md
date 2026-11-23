---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*^- `test/` one test file per module)(?![\s\S]*`tests/`)'
flags: m
weight: 3
---
