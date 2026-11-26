---
type: regex
target: last_message
match: not_contains
pattern: '\byou(?:\x27ve|r)?\s+(?:created|made|authored|started|opened|wrote|pushed)\b[^.\n]*\bbranch|\bbranch\b[^.\n]*\b(?:created|made|authored|started|opened|written) by (?:you|Sam)|\bSam(?: Okafor)?\b[^.\n]*\b(?:created|made|authored|started|opened)\b[^.\n]*\bbranch'
flags: i
weight: 3
---
