---
type: regex
target:
  source: file
  path: src/index.ts
pattern: 'import \{ MAX_RETRIES \} from "\./limits";[\s\S]*import \{ withTax \} from "\./tax";[\s\S]*console\.log\(withTax\(100\), MAX_RETRIES\);'
---
