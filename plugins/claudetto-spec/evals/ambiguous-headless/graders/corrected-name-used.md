---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '^(?=[\s\S]*export (?:async )?(?:function|const) totalWithTax\b)(?![\s\S]*\baddTax\b)'
weight: 2
---
