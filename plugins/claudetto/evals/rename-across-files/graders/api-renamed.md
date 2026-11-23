---
type: regex
target:
  source: file
  path: src/api.ts
pattern: '^(?=[\s\S]*export async function fetchUser\(id: string\))(?=[\s\S]*void fetchUser\(id\);)(?![\s\S]*\bfetchUsr\b)'
weight: 2
---
