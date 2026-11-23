---
type: regex
target:
  source: file
  path: src/fixtures/limits.json
pattern: '^\[\n\t\[1, 1\],\n\t\[100, 100\],\n\t\[101, 100\],\n\t\[250, 100\],\n\t\[500, 100\],\n\t\[100000, 100\]\n\]\n$'
weight: 3
---
