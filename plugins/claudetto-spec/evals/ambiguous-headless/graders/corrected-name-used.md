---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '^(?=[\s\S]*export (?:async )?(?:function|const) totalWithTax\b)(?![\s\S]*(?:\b(?:function|const|let) addTax\b|\baddTax\s*\(|\{[^}\n]*\baddTax\b[^}\n]*\}\s*from))'
weight: 2
---
