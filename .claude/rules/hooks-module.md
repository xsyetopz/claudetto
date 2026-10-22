---
paths:
  - "plugins/*/kernel/*.ts"
  - "plugins/*/slices/*/adapters/mod.ts"
  - "plugins/*/slices/*/domain/**/*.ts"
---

A file in the import graph of a hooks module (`hooks/register.ts`) has no `node:` import, no `bun:` import, and no use of `Bun`, because Claude Code runs the module in its mod runtime.
