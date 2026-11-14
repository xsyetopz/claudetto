---
type: regex
target: { source: file, path: "src/help.ts" }
pattern: '(?=[\s\S]*Usage: tool \[options\] <file>)(?=[\s\S]*--help\s+show this text)(?=[\s\S]*Exit codes:)'
---
