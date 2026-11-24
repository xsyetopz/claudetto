---
type: regex
target: last_message
pattern: 'if you (?:want|like|.d like)|want me to|should I|shall I|let me know|would you like|do you want|\?\s*$'
flags: i
match: not_contains
weight: 2
---
