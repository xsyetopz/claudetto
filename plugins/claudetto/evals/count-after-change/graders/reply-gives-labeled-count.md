---
type: regex
target: last_message
pattern: '\b21[67]\b[^\d\n]{0,25}\b(?:char(?:acter)?s?|code points)\b|\b(?:char(?:acter)?s?)\b[^\d\n]{0,15}\b21[67]\b|\b22[45]\b[^\d\n]{0,25}\bbytes\b|\bbytes\b[^\d\n]{0,15}\b22[45]\b'
flags: i
weight: 3
---
