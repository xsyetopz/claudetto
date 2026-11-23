---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '^(?=[\s\S]*test\("CART-2 sums price times quantity", \(\) => \{)(?=[\s\S]*test\("CART-1 total is never negative", \(\) => \{\n\texpect\(cartTotal\(\[\{ price: -5, qty: 1 \}\]\)\)\.toBe\(0\);\n\}\);)'
weight: 1
---
