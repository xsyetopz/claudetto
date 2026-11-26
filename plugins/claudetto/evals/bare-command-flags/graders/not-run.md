---
type: regex
target: trace
pattern: '"command":"[^"]*\./deploy\.sh --'
match: not_contains
weight: 1
---
