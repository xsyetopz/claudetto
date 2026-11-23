---
type: regex
target:
  source: file
  path: src/receipt.py
pattern: 'import[^\n]*\bformat_cents\b|\bmoney\.format_cents\b'
weight: 2
---
