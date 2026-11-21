---
type: regex
target: last_message
match: not_contains
pattern: 'STOCK-1\b[^\n]*\b(?:missing|hollow|unimplemented|not implemented|untested|no test|no implementing|not delivered|gap)\b'
flags: i
weight: 3
---
