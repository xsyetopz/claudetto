---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*Customers receive one total)(?=[\s\S]*`recieveCopy: true`)(?![\s\S]*recieve(?!Copy))'
weight: 2
---
