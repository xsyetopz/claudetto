---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '^(?=[\s\S]*applyDiscount\(\s*995\s*,\s*10\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*895\s*\))(?![\s\S]*applyDiscount\(\s*995\s*,\s*10\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*896\s*\))'
weight: 3
---
