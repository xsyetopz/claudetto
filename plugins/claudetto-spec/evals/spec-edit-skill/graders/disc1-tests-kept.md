---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: 'test\("DISC-1 takes 10 percent off 999 cents", \(\) => \{\n\texpect\(applyDiscount\(999, 10\)\)\.toBe\(899\);\n\}\);'
weight: 2
---
