---
type: regex
target:
  source: file
  path: src/tax.ts
pattern: 'TAX_RATE = 0\.2;'
match: not_contains
---
