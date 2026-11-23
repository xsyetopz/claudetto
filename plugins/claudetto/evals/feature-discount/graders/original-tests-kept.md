---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '^(?=[\s\S]*test\("sums price times quantity", \(\) => \{\n\texpect\(\n\t\tcartTotal\(\[\n\t\t\t\{ price: 250, qty: 2 \},\n\t\t\t\{ price: 100, qty: 1 \}\n\t\t\]\)\n\t\)\.toBe\(600\);)(?=[\s\S]*test\("an empty cart totals zero", \(\) => \{\n\texpect\(cartTotal\(\[\]\)\)\.toBe\(0\);)'
weight: 1
---
