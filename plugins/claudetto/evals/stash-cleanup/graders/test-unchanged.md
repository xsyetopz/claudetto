---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: 'test\("a line with quantity zero adds nothing", \(\) => \{\n\texpect\(\n\t\tcartTotal\(\[\n\t\t\t\{ price: 250, qty: 0 \},\n\t\t\t\{ price: 100, qty: 1 \}\n\t\t\]\)\n\t\)\.toBe\(100\);\n\}\);\n$'
weight: 2
---
