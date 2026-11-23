---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: 'applyDiscount\(\s*999\s*,\s*10\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*899\s*\)'
weight: 1
---
