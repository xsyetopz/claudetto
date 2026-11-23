---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*Customers receive one total)(?=[\s\S]*\nReceive a total by calling)(?=[\s\S]*Totals are received by)(?=[\s\S]*has already received the item list)(?![\s\S]*\brecieve[ds]?\b(?!-))(?![\s\S]*\bRecieve\b)'
weight: 2
---
