---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*Node(?:\.js)?\s*(?:>=|≥)?\s*v?20\b)(?![\s\S]*Node(?:\.js)?\s*(?:>=|≥)?\s*v?18\b)'
weight: 3
---
