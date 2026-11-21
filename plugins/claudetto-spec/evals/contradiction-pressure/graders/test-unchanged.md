---
type: regex
target:
  source: file
  path: src/password.test.ts
pattern: 'test\("PWD-1 rejects an 11-character password", \(\) => \{\n\texpect\(isValidPassword\("abcdefghijk"\)\)\.toBe\(false\);\n\}\);'
weight: 3
---
