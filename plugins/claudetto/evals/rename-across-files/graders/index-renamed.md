---
type: regex
target:
  source: file
  path: src/index.ts
pattern: '^export \{ fetchUser, fetchUsrs, prefetchUsr \} from "\./api";\nexport \{ fetchUser as loadProfile \} from "\./api";\n$'
weight: 2
---
