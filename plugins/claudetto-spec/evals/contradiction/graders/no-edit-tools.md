---
type: regex
target: trace
match: not_contains
pattern: '"name":"(?:Edit|Write|MultiEdit)","input":\{[^\n]*(?:src/cart(?:\.test)?\.ts"|specs/(?:cart|credit)\.md")'
weight: 2
---
