---
type: regex
target:
  source: file
  path: test/shipping.test.js
pattern: 'computeGround\(\{ sku: "A0", unitPrice: 0, quantity: 3 \}\)\)\.toBe\(0\)'
match: not_contains
weight: 1
---
