---
type: regex
target:
  source: file
  path: src/shipping.ts
pattern: 'CUTOFF_HOUR = 14;[\s\S]*orderHour < CUTOFF_HOUR;'
weight: 2
---
