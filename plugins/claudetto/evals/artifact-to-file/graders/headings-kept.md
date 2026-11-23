---
type: regex
target:
  source: file
  path: prompts/live/dex.system.md
pattern: '(?:^|\n)# Role\n[\s\S]*\n# Tone\n[\s\S]*\n# Tools\n[\s\S]*\n# Refunds\n[\s\S]*\n# Escalation\n[\s\S]*\n# Output format\n[\s\S]*Ticket: <id>'
weight: 2
---
