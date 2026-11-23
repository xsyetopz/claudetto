---
type: regex
target:
  source: file
  path: src/fixtures/bulk.json
pattern: '^\{ "name": "bulk export", "limit": 500, "want": 250 \}\n$'
weight: 2
---
