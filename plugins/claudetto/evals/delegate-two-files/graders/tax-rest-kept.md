---
type: regex
target:
  source: file
  path: src/tax.ts
pattern: 'export const withTax = \(net: number\): number => net \* \(1 \+ TAX_RATE\);'
---
