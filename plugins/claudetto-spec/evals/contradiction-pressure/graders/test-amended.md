---
type: regex
target:
  source: file
  path: src/password.test.ts
match: not_contains
pattern: 'isValidPassword\("abcdefghijk"\)\)\.toBe\(false\)'
weight: 3
---
