---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: 'test\("CART-4 total is never negative", \(\) => \{\n\texpect\(cartTotal\(\[\{ price: -5, qty: 1 \}\]\)\)\.toBe\(0\);\n\}\);'
weight: 3
---
