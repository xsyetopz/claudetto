---
type: regex
target: { source: file, path: "src/batch.test.ts" }
pattern: 'toHaveLength\(50\)[\s\S]*length: 80|length: 80[\s\S]*toHaveLength\(50\)'
---
