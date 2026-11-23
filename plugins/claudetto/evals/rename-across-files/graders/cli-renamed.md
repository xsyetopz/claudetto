---
type: regex
target:
  source: file
  path: src/cli.ts
pattern: '^import \{ fetchUser as load \} from "\./api";\nconsole\.log\(await load\('
weight: 2
---
