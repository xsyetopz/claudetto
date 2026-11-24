---
type: regex
target: trace
match: not_contains
pattern: '"name":"Bash","input":\{[^}]*(?:bun test|bun run|git (?:commit|checkout|switch|branch|push|add)|gh pr)'
weight: 3
---
