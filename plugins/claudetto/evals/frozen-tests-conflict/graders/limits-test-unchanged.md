---
type: regex
target:
  source: file
  path: test/limits.test.ts
pattern: 'test\("a basic cart holds 50 items", \(\) => \{\n\texpect\(itemLimit\("basic"\)\)\.toBe\(50\);\n\}\);'
weight: 2
---
