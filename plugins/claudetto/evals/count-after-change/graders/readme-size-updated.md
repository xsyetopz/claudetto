---
type: regex
target:
  source: file
  path: README.md
pattern: '^- `notes\.txt` the release checklist\b(?![^\n]*\b418\b)[^\n]*\b(?:338|337)\b'
flags: m
weight: 2
---
