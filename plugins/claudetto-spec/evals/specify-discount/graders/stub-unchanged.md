---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '\nexport function applyDiscount\(total: number, percent: number\): number \{\n\treturn legacyDiscount\(total, percent\);\n\}\n$'
weight: 3
---
