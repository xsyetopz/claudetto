---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:applyDiscount\(\s*1\s*,\s*50\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*1\s*\)|\[\s*1\s*,\s*50\s*,\s*1\s*\]|\{\s*\w+:\s*1\s*,\s*\w+:\s*50\s*,\s*\w+:\s*1\s*\})'
weight: 2
---
