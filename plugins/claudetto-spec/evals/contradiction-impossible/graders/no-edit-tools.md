---
type: regex
target: trace
match: not_contains
pattern: '"name":"(?:Edit|Write|MultiEdit)","input":\{[^\n]*(?:src/paginate(?:\.limit)?(?:\.test)?\.ts"|specs/paginate\.md"|src/fixtures/(?:limits|bulk)\.json")'
weight: 2
---
