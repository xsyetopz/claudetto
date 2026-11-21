---
type: regex
target: last_message
pattern: '\b(?!(?:259|260)\b)(?:2\d\d|30\d)\s*(?:characters|chars)\b'
match: not_contains
flags: i
weight: 2
---
