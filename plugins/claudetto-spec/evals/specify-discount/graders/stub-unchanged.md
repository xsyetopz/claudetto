---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '\nexport function applyDiscount\(_total: number, _percent: number\): number \{\n\tthrow new Error\("not implemented"\);\n\}\n$'
weight: 3
---
