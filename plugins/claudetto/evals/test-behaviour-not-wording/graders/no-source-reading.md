---
type: regex
target: { source: file, path: "src/slug.test.ts" }
pattern: 'Bun\.file|readFile|readFileSync|\.toString\(\)|\.source\b'
match: not_contains
---
