---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '^(?=[\s\S]*discounts\.csv)(?=[\s\S]*applyDiscount\()(?![\s\S]*(?:\b(?:test|it|describe)\.(?:skip|todo|only|failing)\b|\b90\b[^\n]{0,60}(?:continue|skip|return)))'
weight: 2
---
