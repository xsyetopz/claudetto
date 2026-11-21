---
type: regex
target:
  source: file
  path: src/limits.ts
pattern: 'MAX_RETRIES = 3'
match: not_contains
---
