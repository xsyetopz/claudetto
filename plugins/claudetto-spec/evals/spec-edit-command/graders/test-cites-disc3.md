---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:test|it)(?:\.each\([^)]*\))?\(\s*["''`][^"''`]*\bDISC-3\b'
weight: 2
---
