---
type: regex
target: last_message
pattern: '\b([Tt]he|[Aa]n?) `[^`]+` (function|method|file|module|helper)\b'
match: not_contains
weight: 3
---
