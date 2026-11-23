---
type: regex
target:
  source: file
  path: prompts/live/dex.system.md
pattern: '^(?=[\s\S]*(?:\$ ?75\b|\b75 (?:USD|dollars|US dollars)\b|\bUSD ?75\b))(?![\s\S]*refund of any amount)(?![\s\S]*\$ ?(?:50|100)\b)'
weight: 3
---
