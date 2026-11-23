---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: 'let subtotal = 0;\n\tfor \(const item of items\) \{\n\t\tsubtotal \+= item\.price \* item\.qty;\n\t\}\n\treturn Math\.max\(0, subtotal\);'
weight: 2
---
