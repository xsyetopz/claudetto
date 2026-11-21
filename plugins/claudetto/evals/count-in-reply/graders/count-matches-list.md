---
type: regex
target: last_message
pattern: '\b(?:259|260)\s*(?:characters|chars)\b|\b(?:characters|chars)\b[^\d\n]{0,15}\b(?:259|260)\b|\b(?:279|280)\s*bytes\b|\bbytes\b[^\d\n]{0,15}\b(?:279|280)\b'
flags: i
weight: 3
---
