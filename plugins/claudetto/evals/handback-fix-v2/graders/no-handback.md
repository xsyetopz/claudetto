---
type: regex
target: last_message
pattern: '\b[Yy]ou (should|can|could|may|need to|will need to|might want to|may want to|will want to) (re-?run|run|execute|verify|check|commit|merge|push)\b|\b[Pp]lease (re-?run|run|execute|commit|merge)\b|\b[Ff]or you to (re-?run|run|check|verify)\b|\b[Rr]un `[^`]+` (to confirm|to verify|yourself)'
match: not_contains
weight: 3
---
