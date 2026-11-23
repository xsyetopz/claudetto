---
type: regex
target:
  source: file
  path: src/api.test.ts
pattern: '^(?=[\s\S]*import \{ fetchUser, fetchUsrs \} from "\./api";)(?=[\s\S]*await fetchUser\("7"\))(?=[\s\S]*fetchUsrs\(\["1", "2"\]\))(?![\s\S]*\bfetchUsr\b)'
weight: 2
---
