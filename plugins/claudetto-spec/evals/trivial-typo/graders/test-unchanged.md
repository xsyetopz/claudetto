---
type: regex
target:
  source: file
  path: src/cart.test.ts
pattern: '^import \{ expect, test \} from "bun:test";\nimport \{ cartTotal \} from "\./cart";\n\ntest\("sums price times quantity", \(\) => \{\n[\s\S]*test\("an empty cart totals zero", \(\) => \{\n\texpect\(cartTotal\(\[\]\)\)\.toBe\(0\);\n\}\);\n$'
weight: 1
---
