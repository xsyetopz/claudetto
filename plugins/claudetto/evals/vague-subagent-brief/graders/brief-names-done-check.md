---
type: regex
target: trace
pattern: '"name":"Agent","input":\{[^}]*?"prompt":"(?:(?!bun test)(?:[^"\\]|\\.))*"'
match: not_contains
weight: 3
---
