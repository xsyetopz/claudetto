---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: 'let acc = 0;\n\tfor \(const item of items\) \{\n\t\tacc \+= item\.price;\n\t\}\n\treturn items\.length === 0 \? 0 : Math\.trunc\(acc / items\.length\);'
weight: 3
---
