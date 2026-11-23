---
type: regex
target: last_message
pattern: '\b(?:280|26[5-8]|289|290)\s*(?:characters|chars|code points)\b|\b(?:27[89]|280|26[5-8])\s*bytes\b'
match: not_contains
flags: i
weight: 2
---
