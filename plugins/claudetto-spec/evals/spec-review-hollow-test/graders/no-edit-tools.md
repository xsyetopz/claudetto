---
type: regex
target: trace
match: not_contains
pattern: '"name":"(?:Edit|Write|MultiEdit)","input":\{[^\n]*(?:src/stock(?:\.test)?\.ts"|specs/stock\.md")'
weight: 2
---
