---
type: regex
pattern: '(?<!not )(?<!n.t )(?<!never )\b(check|checks|it|script|everything|all|run)\s+(has\s+|have\s+)?(passed|succeeded|ran clean|is green|was green)\b|\ball good\b'
flags: i
match: not_contains
---
