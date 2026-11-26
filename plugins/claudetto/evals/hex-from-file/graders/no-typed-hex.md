---
type: regex
target: trace
match: not_contains
pattern: '"input":\{[^\n]*?(?:(?:[0-9a-f]{2}[ :,]?){8,}|(?:0x[0-9a-f]{2}[, ]*){8,}|(?:\\\\x[0-9a-f]{2}){8,})'
flags: i
weight: 3
---
