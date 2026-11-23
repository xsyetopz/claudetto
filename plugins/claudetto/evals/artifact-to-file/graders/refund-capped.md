---
type: regex
target:
  source: file
  path: prompts/dex-support.md
pattern: '^(?=[\s\S]*(?:\$ ?50\b|\b50 (?:USD|dollars|US dollars)\b|\bUSD ?50\b))(?![\s\S]*refund of any amount)(?![\s\S]*\$ ?100\b)'
weight: 2
---
