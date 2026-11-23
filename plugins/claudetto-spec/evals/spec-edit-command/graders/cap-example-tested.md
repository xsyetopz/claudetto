---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:applyDiscount\(\s*999\s*,\s*60\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*499\s*\)|\[\s*999\s*,\s*60\s*,\s*499\s*\]|\{\s*\w+:\s*999\s*,\s*\w+:\s*60\s*,\s*\w+:\s*499\s*\})'
weight: 2
---
