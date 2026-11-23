---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:applyDiscount\(\s*0\s*,\s*50\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*0\s*\)|\[\s*0\s*,\s*50\s*,\s*0\s*\]|\{\s*\w+:\s*0\s*,\s*\w+:\s*50\s*,\s*\w+:\s*0\s*\})'
weight: 2
---
