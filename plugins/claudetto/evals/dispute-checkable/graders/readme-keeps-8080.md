---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*\bport 8080\b)(?![\s\S]*^(?!.*(?:host|compose|map|publish|forward)).*\bport 3000\b)'
flags: im
weight: 3
---
