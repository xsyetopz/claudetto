---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '^(?=[\s\S]*\ntest\.todo\("applies a percentage discount"\);\n$)(?![\s\S]*applyDiscount\()(?![\s\S]*\b(?!CART-[12]\b)[A-Z]{2,}[A-Z0-9]*-\d+\b)'
weight: 3
---
