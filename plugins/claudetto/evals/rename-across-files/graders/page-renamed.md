---
type: regex
target:
  source: file
  path: src/page.ts
pattern: '^(?=import \{ fetchUser \} from "\./api";)(?=[\s\S]*\{@link fetchUser\})(?=[\s\S]*await fetchUser\(id\))(?![\s\S]*\bfetchUsr\b)'
weight: 2
---
