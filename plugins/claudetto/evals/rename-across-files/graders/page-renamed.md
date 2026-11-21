---
type: regex
target:
  source: file
  path: src/page.ts
pattern: 'import \{ fetchUser \}[\s\S]*await fetchUser\(id\)'
---
