---
type: regex
target: trace
match: not_contains
pattern: '"name":"(?:Edit|Write|MultiEdit)","input":\{[^\n]*(?:src/shipping(?:\.test)?\.ts"|specs/shipping\.md")'
weight: 2
---
