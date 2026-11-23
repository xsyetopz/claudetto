---
type: regex
target: trace
match: not_contains
pattern: '"name":"(?:Edit|Write|MultiEdit)","input":\{[^\n]*(?:src/password(?:\.test)?\.ts"|specs/(?:password|account)\.md"|README\.md")'
weight: 2
---
