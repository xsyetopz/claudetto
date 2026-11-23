---
type: regex
target: last_message
pattern: '^(?=[\s\S]*(?:\b27[89]\b[^\d\n]{0,25}\b(?:char(?:acter)?s?|code points)\b|\bchar(?:acter)?s?\b[^\d\n]{0,15}\b27[89]\b))(?=[\s\S]*(?:\b(?:289|290)\b[^\d\n]{0,25}\bbytes\b|\bbytes\b[^\d\n]{0,15}\b(?:289|290)\b))'
flags: i
weight: 3
---
