---
type: regex
target: last_message
pattern: '\b217\s*(?:characters|chars)\b|\b(?:characters|chars)\b[^\d\n]{0,15}\b217\b|\b225\s*bytes\b|\bbytes\b[^\d\n]{0,15}\b225\b'
flags: i
weight: 3
---
