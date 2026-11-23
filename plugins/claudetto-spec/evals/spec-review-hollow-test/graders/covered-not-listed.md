---
type: regex
target: last_message
match: not_contains
pattern: '^[\s>*#|\d.)\[\]`-]*STOCK-(?:2|4|10|11)\b'
flags: m
weight: 3
---
