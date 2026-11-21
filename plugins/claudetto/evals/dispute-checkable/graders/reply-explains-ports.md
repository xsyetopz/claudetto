---
type: regex
target: last_message
pattern: '^(?=[\s\S]*\b8080\b)(?=[\s\S]*(?:3000[\s\S]{0,80}(?:host|compose|map|publish|forward)|(?:host|compose|map|publish|forward)[\s\S]{0,80}3000))'
flags: i
weight: 2
---
