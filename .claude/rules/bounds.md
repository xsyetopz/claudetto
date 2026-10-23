---
paths:
  - "tools/limits.ts"
  - "plugins/claudetto/kernel/budget.ts"
  - "plugins/*/slices/*/limits.ts"
  - "tests/**"
---

Change a shared runtime bound only in `plugins/claudetto/kernel/budget.ts`,
a slice bound only in `slices/<s>/limits.ts`,
and a repository bound only in `tools/limits.ts`.
Tests pin the copies of each bound in code and config, not in prose.
