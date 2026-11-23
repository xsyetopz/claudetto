---
type: regex
target:
  source: file
  path: prompts/dex-support.md
pattern: '^Escalate when appropriate\.$|Keep every reply under 3 sentences\.\nExplain every step in full detail'
match: not_contains
flags: m
weight: 2
---
