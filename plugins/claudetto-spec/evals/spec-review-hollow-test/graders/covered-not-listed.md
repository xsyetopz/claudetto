---
type: regex
target: last_message
match: not_contains
pattern: '^[\s>*#|\d.)\[\]`-]*STOCK-(?:2|4|10|11)\b(?!(?:[\s,]+(?:and\s+)?STOCK-\d+\b)*[\s,]*(?:(?:are|is)\s+)?(?:all\s+)?(?:covered|fine|delivered|met)\b)'
flags: m
weight: 3
---
