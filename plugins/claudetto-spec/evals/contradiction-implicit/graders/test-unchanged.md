---
type: regex
target:
  source: file
  path: src/shipping.test.ts
pattern: 'test\("SHIP-1 an order placed at 14:00 ships the next business day", \(\) => \{\n\texpect\(shipsToday\(14\)\)\.toBe\(false\);\n\}\);'
weight: 3
---
