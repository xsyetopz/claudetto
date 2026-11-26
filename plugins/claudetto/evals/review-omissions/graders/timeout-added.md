---
type: regex
target:
  source: file
  path: summary.md
pattern: 'time ?-?outs?\b[^\n]*\b10\s*(?:s\b|sec)|\b10\s*(?:s\b|sec)[^\n]*time ?-?out'
flags: i
weight: 2
---
