---
paths:
  - "src/plugins/*/slices/*/lab/*.test.ts"
---

Each slice keeps its hook lab tests in `lab/*.test.ts`, and `just generate` copies them to `plugins/<name>/tests/`, which `claude plugin test` runs against the hooks module.
