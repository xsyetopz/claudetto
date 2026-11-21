---
type: regex
target: last_message
pattern: '\b(?:259|260)\b[^\d\n]{0,25}\b(?:char(?:acter)?s?|code points)\b|\b(?:char(?:acter)?s?)\b[^\d\n]{0,15}\b(?:259|260)\b|\b(?:279|280)\b[^\d\n]{0,25}\bbytes\b|\bbytes\b[^\d\n]{0,15}\b(?:279|280)\b'
flags: i
weight: 3
---
