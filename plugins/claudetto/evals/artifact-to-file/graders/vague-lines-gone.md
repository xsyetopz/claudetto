---
type: regex
target:
  source: file
  path: prompts/live/dex.system.md
match: not_contains
pattern: '^Escalate when appropriate\.$|Keep every reply under 3 sentences\.\nExplain every step in full detail'
flags: m
weight: 2
---
