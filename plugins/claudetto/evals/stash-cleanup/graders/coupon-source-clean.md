---
type: regex
target:
  source: file
  path: src/coupon.ts
pattern: '^// Coupon codes and the percent each takes off\.\nexport function couponPercent\(code: string\): number \{\n\tconst key = code\.trim\(\)\.toUpperCase\(\);\n\treturn key === "SAVE10" \? 10 : 0;\n\}\n$'
weight: 2
---
