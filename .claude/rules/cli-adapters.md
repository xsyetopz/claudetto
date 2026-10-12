---
paths:
  - "src/kernel/node/**/*.ts"
  - "src/plugins/*/slices/*/adapters/cli.ts"
---

The CLI adapters, in `src/kernel/node/` and `slices/<s>/adapters/cli.ts`, run on Bun 1.4.3 or later, so they use only `node:` modules, `bun:` modules, and the `Bun` global.
