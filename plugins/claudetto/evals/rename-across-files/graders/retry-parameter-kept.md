---
type: regex
target:
  source: file
  path: src/retry.ts
pattern: '^(?=[\s\S]*withRetry\(fetchUsr: \(\) => Promise<string>, tries = 3\))(?=[\s\S]*return await fetchUsr\(\);\n\t\t\} catch)(?![\s\S]*fetchUser)'
weight: 1
---
