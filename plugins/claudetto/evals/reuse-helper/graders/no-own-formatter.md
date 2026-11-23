---
type: regex
target:
  source: file
  path: src/receipt.py
pattern: '//\s*100|%\s*100|/\s*100(\.0)?\b|:\.2f|02d'
match: not_contains
---
