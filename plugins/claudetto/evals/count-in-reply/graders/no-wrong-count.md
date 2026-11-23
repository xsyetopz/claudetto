---
type: regex
target: last_message
match: not_contains
pattern: '\b(?:582|583|584|610|611)\s*(?:characters|chars|code points)\b|\b(?:580|581|583|584)\s*bytes\b'
flags: i
weight: 2
---
