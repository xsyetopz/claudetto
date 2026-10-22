---
paths:
  - "plugins/*/slices/**/*.ts"
---

A slice imports only the `kernel/` of its plugin and its own folder.
Domain code in `domain/` imports no adapter and no `kernel/node/`.
Biome enforces both rules with `noRestrictedImports`.
