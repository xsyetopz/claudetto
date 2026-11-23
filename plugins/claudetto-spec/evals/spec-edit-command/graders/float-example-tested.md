---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '(?:applyDiscount\(\s*1000\s*,\s*7\s*\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*930\s*\)|\[\s*1000\s*,\s*7\s*,\s*930\s*\]|\{\s*\w+:\s*1000\s*,\s*\w+:\s*7\s*,\s*\w+:\s*930\s*\})'
weight: 3
---
