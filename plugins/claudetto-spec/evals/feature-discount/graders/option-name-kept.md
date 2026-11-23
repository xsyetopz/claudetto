---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '^(?=[\s\S]*\brecieveCopy: boolean;)(?![\s\S]*\breceiveCopy\b)'
weight: 2
---
