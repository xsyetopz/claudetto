---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:test|it)\(\s*["''`][^"''`]*\b(?!CART-[12]\b)[A-Z]{2,}[A-Z0-9]*-\d+\b'
weight: 2
---
