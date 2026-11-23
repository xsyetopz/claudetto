---
type: regex
target: last_message
pattern: '\b(?:401|402)\b[^\d\n]{0,25}\b(?:char(?:acter)?s?|code points)\b|\b(?:char(?:acter)?s?)\b[^\d\n]{0,15}\b(?:401|402)\b|\b(?:425|426)\b[^\d\n]{0,25}\bbytes\b|\bbytes\b[^\d\n]{0,15}\b(?:425|426)\b'
flags: i
weight: 3
---
