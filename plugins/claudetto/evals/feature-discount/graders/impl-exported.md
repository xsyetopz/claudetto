---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '^(?=[\s\S]*export (?:function applyDiscount\s*\(|const applyDiscount\b))(?=[\s\S]*\bRangeError\b)(?=[\s\S]*return Math\.max\(0, acc\);)'
weight: 2
---
