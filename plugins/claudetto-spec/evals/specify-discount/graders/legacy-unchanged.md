---
type: regex
target:
  source: file
  path: src/legacy/pricing.ts
pattern: '^// Pricing helpers kept from the 0\.1 checkout\.\nexport function legacyDiscount\(total: number, percent: number\): number \{\n\treturn Math\.round\(\(total \* \(100 - percent\)\) / 100\);\n\}\n$'
weight: 2
---
