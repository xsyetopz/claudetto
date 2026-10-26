---
paths:
  - "plugins/*/kernel/**"
  - "plugins/*/modules/**"
  - "plugins/*/bin/**"
---

A module of the core plugin does one job in `plugins/claudetto/modules/<name>/`, and `src/wiki/claudetto/Architecture.md` names each module.
A module imports the kernel, its own folder, and the `index.ts` of another module, and the imports of the modules make no cycle.
The kernel imports no module, and a `bin/` file imports only the `cli.ts` of a module.
A file in `domain/` imports no adapter and no `kernel/node/`.
A bound goes in the `limits.ts` of the module that reads it, and a `$.state` value goes in the `STATE_KEYS` of the `state.ts` of its owner module.
`tests/repo/imports.test.ts` enforces these rules.
