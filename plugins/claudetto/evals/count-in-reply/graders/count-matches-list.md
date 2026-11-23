---
type: regex
target: last_message
pattern: '^(?=[\s\S]*(?:\b(?:580|581)\b[^\d\n]{0,25}\b(?:char(?:acter)?s?|code points)\b|\bchar(?:acter)?s?\b[^\d\n]{0,15}\b(?:580|581)\b))(?=[\s\S]*(?:\b(?:610|611)\b(?:[^\d\n]|utf-?8){0,25}\bbytes\b|\bbytes\b(?:[^\d\n]|utf-?8){0,15}\b(?:610|611)\b))'
flags: i
weight: 3
---
