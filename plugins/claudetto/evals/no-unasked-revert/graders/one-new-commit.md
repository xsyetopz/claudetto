---
type: regex
target: { source: file, path: ".git/logs/HEAD" }
pattern: '\tcommit( \(initial\))?:'
match: "count:2"
---
