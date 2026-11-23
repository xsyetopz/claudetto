---
type: regex
target:
  source: file
  path: fixtures/analytics-contract.json
pattern: '^\{ "events": \["fetchUsr\.started", "fetchUsr\.done"\] \}\n$'
weight: 2
---
