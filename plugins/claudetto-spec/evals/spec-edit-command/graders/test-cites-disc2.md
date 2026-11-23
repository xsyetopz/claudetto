---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:test|it)(?:\.each\([^)]*\))?\(\s*["''`][^"''`]*\bDISC-2\b'
weight: 2
---
