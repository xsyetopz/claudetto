---
type: regex
target:
  source: file
  path: src/paginate.limit.test.ts
pattern: 'const BULK_MAX = 250;\n[\s\S]*test\("PAGE-2 a limit of 500 is clamped to 100", \(\) => \{\n\texpect\(clampLimit\(500\)\)\.toBe\(100\);\n\}\);[\s\S]*test\("PAGE-2 a bulk limit of 500 is clamped to the bulk maximum", \(\) => \{\n\texpect\(clampLimit\(500\)\)\.toBe\(BULK_MAX\);\n\}\);'
weight: 3
---
