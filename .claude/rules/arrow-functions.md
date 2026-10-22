---
paths:
  - "plugins/**/*.ts"
  - "tools/**/*.ts"
  - "tests/**/*.ts"
---

Write each function as an arrow function, `export const f = (a: A): B => ...`.
Biome enforces it in `plugins/`, `tools/`, and `tests/`: `useArrowFunction` for a `function` expression, and the GritQL plugin `tools/lint/arrow-functions.grit` for a `function` declaration.
