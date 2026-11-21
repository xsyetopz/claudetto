---
type: regex
target:
  source: file
  path: src/paginate.limit.test.ts
pattern: 'test\("PAGE-2 a limit of 500 is clamped", \(\) => \{\n\texpect\(clampLimit\(500\)\)\.toBe\(100\);\n\texpect\(clampLimit\(500\)\)\.toBe\(250\);\n\}\);'
weight: 3
---
