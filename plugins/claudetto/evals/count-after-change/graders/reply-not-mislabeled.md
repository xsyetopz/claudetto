---
type: regex
target: last_message
pattern: '\b21[67]\s*bytes\b|\b22[45]\s*(?:characters|chars)\b'
match: not_contains
flags: i
weight: 2
---
