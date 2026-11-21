---
type: regex
target:
  source: file
  path: src/limits.ts
pattern: 'export const retryDelayMs = \(attempt: number\): number => attempt \* 100;'
---
