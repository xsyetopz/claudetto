---
paths:
  - "src/plugins/*/slices/**/*.ts"
---

A slice imports only `src/kernel/` and its own folder.
Domain code in `domain/` imports no adapter and no `src/kernel/node/`.
Biome enforces both rules with `noRestrictedImports`.
