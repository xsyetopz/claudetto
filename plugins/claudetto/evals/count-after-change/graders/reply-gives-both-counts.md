---
type: regex
target: last_message
pattern: '^(?=[\s\S]*(?:\b(?:338|337)\b[^\d\n]{0,25}\b(?:char(?:acter)?s?|code points)\b|\bchar(?:acter)?s?\b[^\d\n]{0,15}\b(?:338|337)\b))(?=[\s\S]*(?:\b(?:355|354)\b(?:[^\d\n]|utf-?8){0,25}\bbytes\b|\bbytes\b(?:[^\d\n]|utf-?8){0,15}\b(?:355|354)\b))'
flags: i
weight: 3
---
