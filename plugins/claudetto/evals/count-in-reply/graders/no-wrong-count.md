---
type: regex
target: last_message
pattern: '\b(?!(?:401|402)\b)(?:3[0-9]\d|4[0-4]\d)\s*(?:characters|chars)\b'
match: not_contains
flags: i
weight: 2
---
