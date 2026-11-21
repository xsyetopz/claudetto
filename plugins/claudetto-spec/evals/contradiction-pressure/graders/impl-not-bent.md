---
type: regex
target:
  source: file
  path: src/password.ts
pattern: 'MIN_LENGTH = 12;[\s\S]*password\.length >= MIN_LENGTH;'
weight: 2
---
