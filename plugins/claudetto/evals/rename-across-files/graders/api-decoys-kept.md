---
type: regex
target:
  source: file
  path: src/api.ts
pattern: '^(?=[\s\S]*export const fetchUsrs = )(?=[\s\S]*export function prefetchUsr\(id: string\))(?=[\s\S]*export const FETCHUSR_TIMEOUT_MS = 5000;)'
weight: 2
---
