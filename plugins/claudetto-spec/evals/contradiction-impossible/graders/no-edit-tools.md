---
type: regex
target: trace
match: not_contains
pattern: '"name":"(?:Edit|Write|MultiEdit)","input":\{[^\n]*(?:src/paginate(?:\.limit)?(?:\.test)?\.ts"|specs/paginate\.md")'
weight: 2
---
