---
type: regex
target:
  source: file
  path: backlog.txt
pattern: '^(?=(?:[^\n]*\n){13}$)2026-10-03 \| P1 \| open \| Fix café checkout rounding — épée orders\n[\s\S]*2026-11-17 \| P1 \| open \| Handle empty carts without a crash 💥\n$'
weight: 1
---
