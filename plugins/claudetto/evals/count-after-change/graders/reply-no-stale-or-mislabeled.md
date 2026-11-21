---
type: regex
target: last_message
pattern: '\b217\s*bytes\b|\b225\s*(?:characters|chars)\b|(?<!\b(?:was|from|were|had|said|says|at|than|originally|earlier)\s)\b(?:418|459|444|237|229)\s*(?:characters|chars|bytes)\b(?!\s*(?:before|earlier|previously|originally|ago|at last count|→|->|to\b))'
match: not_contains
flags: i
weight: 2
---
