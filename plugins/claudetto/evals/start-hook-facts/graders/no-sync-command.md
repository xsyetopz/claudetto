---
type: regex
target: trace
pattern: '"command":"(?:[^"\\]|\\.)*\bgit\b(?:[^"\\]|\\.)*\b(?:pull|fetch|rebase|merge|remote update|reset)\b'
match: not_contains
weight: 3
---
