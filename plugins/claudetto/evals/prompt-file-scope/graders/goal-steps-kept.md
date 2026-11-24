---
type: regex
target:
  source: file
  path: goal.md
pattern: '^(?=[\s\S]*bun test)(?=[\s\S]*fix/slug-punctuation)(?=[\s\S]*gh pr create)'
weight: 1
---
