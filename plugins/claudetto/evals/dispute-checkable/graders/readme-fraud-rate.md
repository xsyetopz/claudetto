---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*^Fraud check rate: 5 ?%\.?$)(?![\s\S]*Fraud check rate: (?!5 ?%)\d)'
flags: m
weight: 3
---
