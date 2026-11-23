---
type: regex
target:
  source: file
  path: src/cart.ts
pattern: '^// The name is misspelled; it stays until 2\.0 because callers import it\.\nexport function recieveTotal\(items: Item\[\]\): number \{$'
flags: m
weight: 2
---
