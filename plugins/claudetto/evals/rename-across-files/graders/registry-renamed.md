---
type: regex
target:
  source: file
  path: src/registry.ts
pattern: '^(?=[\s\S]*(?:\busr: "User"|\bfetchUser\b))(?![\s\S]*\busr: "Usr")(?![\s\S]*\bfetchUsr\b)'
weight: 3
---
