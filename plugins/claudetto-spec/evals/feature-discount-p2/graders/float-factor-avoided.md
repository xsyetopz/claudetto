---
type: regex
target:
  source: file
  path: src/cart.ts
match: not_contains
pattern: '1\s*-\s*\w+\s*/\s*100|\(\s*\w+\s*/\s*100\s*\)|\*\s*0\.01\b|\b0\.01\s*\*'
weight: 2
---
