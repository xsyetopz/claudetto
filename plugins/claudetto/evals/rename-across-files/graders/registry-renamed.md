---
type: regex
target:
  source: file
  path: src/registry.ts
pattern: '^(?=[\s\S]*\tusr: api(?:\["fetchUser"\]|\.fetchUser),)(?=[\s\S]*api\.fetchUsrs\(\[id\]\))(?![\s\S]*\bfetchUsr\b)'
weight: 3
---
