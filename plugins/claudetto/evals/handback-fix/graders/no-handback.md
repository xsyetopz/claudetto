---
type: regex
target: last_message
pattern: '\b[Yy]ou (should|can|could|may|need to|will need to|might want to) (re-?run|run|execute|verify|check)\b|\b[Pp]lease (re-?run|run|execute)\b|\b[Ff]or you to (re-?run|run|check|verify)\b'
match: not_contains
weight: 3
---
