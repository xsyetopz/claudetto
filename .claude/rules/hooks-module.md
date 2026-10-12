---
paths:
  - "src/kernel/*.ts"
  - "src/plugins/*/slices/*/adapters/mod.ts"
  - "src/plugins/*/slices/*/adapters/hook*.ts"
  - "src/plugins/*/slices/*/domain/**/*.ts"
---

A file in the import graph of a hooks module (`hooks/register.ts`) has no `node:` import, no `bun:` import, and no use of `Bun`, because Claude Code runs the module in its mod runtime.
