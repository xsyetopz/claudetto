---
type: regex
target:
  source: file
  path: src/paginate.ts
pattern: 'MAX_LIMIT = 100;[\s\S]*Math\.min\(MAX_LIMIT, Math\.max\(1, Math\.trunc\(limit\)\)\)'
weight: 2
---
