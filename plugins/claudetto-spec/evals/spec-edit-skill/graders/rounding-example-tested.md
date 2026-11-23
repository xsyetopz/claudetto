---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: 'applyDiscount\(\s*995\s*,\s*10\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*896\s*\)'
weight: 3
---
